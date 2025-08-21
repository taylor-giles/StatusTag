import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { IncomingMessage } from 'http';
import { getActiveImageForDevice, insertDevice } from './db';
import { coverGif, coverImage, getImagePatches, isGif } from './utils';

const PORT = 8080;
const REFRESH_INTERVAL = 5000; // 5 seconds
const PING_INTERVAL = 10000; // 10 seconds

enum PatchType {
    NEW = 1,
    GIF = 2,
    EOF = 3,
    IMG = 4
}

interface ConnectionInfo {
    id: string;
    width: number;
    height: number;
    bufferSize: number;
    maxFileSize: number;
    refreshInterval?: NodeJS.Timeout; // Optional refresh interval
}

// Extend WebSocket to include connectionInfo
interface AppWebSocket extends WebSocket {
    connectionInfo: ConnectionInfo;
}

const wss = new WebSocketServer({ port: PORT });
const activeImages: Record<string, {id: number, data: Buffer}> = {};
const patchLists: Record<string, Buffer[]> = {};

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const { query } = url.parse(req.url || '', true);
    const id = typeof query.id === 'string' ? query.id : '';
    const width = typeof query.width === 'string' ? parseInt(query.width, 10) : NaN;
    const height = typeof query.height === 'string' ? parseInt(query.height, 10) : NaN;
    const bufferSize = typeof query.bufferSize === 'string' ? parseInt(query.bufferSize, 10) : 2500;
    const maxFileSize = typeof query.maxFileSize === 'string' ? parseInt(query.maxFileSize, 10) : 2000000;

    // Reject connection if any required parameter is missing or invalid
    if (!id || isNaN(width) || isNaN(height)) {
        ws.send('Connection rejected - required parameters missing or invalid');
        ws.close(1008, 'Required parameters missing or invalid');
        console.log('Connection rejected - required parameters missing or invalid');
        return;
    }

    const appWs = ws as AppWebSocket;
    appWs.connectionInfo = { id, width, height, bufferSize, maxFileSize };

    console.log('New connection:', { id, width, height, bufferSize, maxFileSize });
    insertDevice(id, width, height);

    // Continuously poll for updates to the active image, and inform device when image is updated
    const refresh = async () => {
        if(await refreshActiveImage((ws as AppWebSocket).connectionInfo)){
            console.log("Image update detected for device:", id);
            const buf = Buffer.alloc(2);
            buf.writeUInt16LE(PatchType.NEW, 0);
            ws.send(buf);
            let image = activeImages[id];
            if(!image){
                console.error("ERROR: Failed to access image for device:", id);
                return;
            }
        }
    }
    appWs.connectionInfo.refreshInterval = setInterval(refresh, REFRESH_INTERVAL);
    refresh();

    // Messasge handling - all incoming messages should be a Uint16 seqnum (request for next patch)
    ws.on('message', async (message: Buffer) => {
        try {
            if (message.length != 2) {
                console.log(`Invalid message length: ${message.length}. Expected 2 bytes.`);
                return;
            }
            let seqnum = message.readUint16LE();
            if(!patchLists[id]) {
                return;
            }
            let patches = patchLists[id];
            if (patches.length > seqnum) {
                ws.send(patches[seqnum]);
            } else {
                // EOF - End of File
                const buf = Buffer.alloc(2);
                buf.writeUInt16LE(PatchType.EOF, 0);
                ws.send(buf);
                console.log("Finished sending image data for device:", id);
            }
        } catch (error) {
            console.error('Error reading message:', error);
        }
    });

    // WebSocket keepalive heartbeat
    let isAlive = true;
    ws.on('pong', () => {
        isAlive = true;
    });
    const pingInterval = setInterval(() => {
        if (!isAlive) {
            console.log(`No heartbeat from device ${id}, terminating connection.`);
            ws.terminate();
            return;
        }
        isAlive = false;
        ws.ping();
    }, PING_INTERVAL);

    // Disconnect handling
    const onDisconnect = () => {
        clearInterval(appWs.connectionInfo.refreshInterval);
        clearInterval(pingInterval);
        delete activeImages[id];
        delete patchLists[id];
    }
    ws.on('close', () => {
        console.log(`Connection closed for device ${id}`);
        onDisconnect();
    });
    ws.on('error', (err) => {
        console.error(`WebSocket error for device ${id}:`, err);
        onDisconnect();
    });
});

console.log(`WebSocket server running on port ${PORT}`);


async function refreshActiveImage({ id, width, height, bufferSize }: ConnectionInfo): Promise<boolean> {
    let image = getActiveImageForDevice(id);
    if(!image){
        console.error("ERROR: No image found for device:", id);
        return false;
    }

    // If the image has not changed, take no action
    if(activeImages[id] && activeImages[id].id === image.id){
        return false;
    }

    if(isGif(image.data)){
        // Break raw GIF data into segments
        patchLists[id] = [];
        let gifData = await coverGif(image.data, width, height);
        for(let i = 0; i < gifData.length; i += bufferSize-2){
            const buf = Buffer.alloc(2);
            buf.writeUInt16LE(PatchType.GIF, 0);
            patchLists[id].push(Buffer.concat([buf, gifData.subarray(i, i+bufferSize-2)]));
        }
    } else {
        patchLists[id] = [];

        // Get image patches
        let patches = await getImagePatches(await coverImage(image.data, width, height), bufferSize);
        for(let patch of patches){
            let buf = Buffer.alloc(patch.length * 2 + 2);
            buf.writeUInt16LE(PatchType.IMG, 0);
            for(let i = 0; i < patch.length; i++){
                buf.writeUInt16LE(patch[i], i * 2 + 2);
            }
            patchLists[id].push(buf);
        }
    }
    activeImages[id] = image;
    return true;
}