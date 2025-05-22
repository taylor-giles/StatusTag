import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { IncomingMessage } from 'http';
import { getActiveImageForDevice } from '$lib/server/db';
import { getPatches } from '$lib/server/serverUtils';

const PORT = 8080;

enum PatchType {
    DATA = 1,
    DELAY = 2,
    EOF = 3
}

interface ConnectionInfo {
    id: string;
    width: number;
    height: number;
    bufferSize: number;
}

// Extend WebSocket to include connectionInfo
interface AppWebSocket extends WebSocket {
    connectionInfo: ConnectionInfo;
}

const wss = new WebSocketServer({ port: PORT });

const patchLists: Record<string, (Uint16Array | number)[]> = {};

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const { query } = url.parse(req.url || '', true);
    const id = typeof query.id === 'string' ? query.id : '';
    const width = typeof query.width === 'string' ? parseInt(query.width, 10) : NaN;
    const height = typeof query.height === 'string' ? parseInt(query.height, 10) : NaN;
    const bufferSize = typeof query.bufferSize === 'string' ? parseInt(query.bufferSize, 10) : 2500;

    // Reject connection if any required parameter is missing or invalid
    if (!id || isNaN(width) || isNaN(height)) {
        ws.send('Connection rejected - required parameters missing or invalid');
        ws.close(1008, 'Required parameters missing or invalid');
        console.log('Connection rejected - required parameters missing or invalid');
        return;
    }

    const appWs = ws as AppWebSocket;
    appWs.connectionInfo = { id, width, height, bufferSize };

    console.log('New connection:', { id, width, height, bufferSize });

    ws.on('message', async (message: Buffer) => {
        try {
            if (message.length != 2) {
                // All incoming messages should be a Uint16 seqnum
                return;
            }
            let seqNum = message.readUint16LE();
            // console.log(`Received request for seqnum: ${seqNum}`);

            // Refresh the active image if needed
            if (!patchLists[id]) {
                if(!await refreshActiveImage((ws as AppWebSocket).connectionInfo)){
                    console.error("ERROR: Failed to refresh active image for device:", id);
                    return;
                }
            }

            let patches = patchLists[id];
            if (patches.length > seqNum) {
                let patch = patches[seqNum];
                if (typeof patch === 'number') {
                    // This is a delay value, indicating the time to show the current frame
                    const buf = Buffer.alloc(4);
                    buf.writeUInt16LE(PatchType.DELAY, 0)
                    buf.writeUInt16LE(patch, 2);
                    ws.send(buf);
                } else {
                    // Send the patch data as little-endian
                    const patchArray = patch as Uint16Array;
                    const buf = Buffer.alloc(patchArray.length * 2 + 2);
                    buf.writeUInt16LE(PatchType.DATA, 0);
                    for (let i = 0; i < patchArray.length; i++) {
                        buf.writeUInt16LE(patchArray[i], i * 2 + 2);
                    }
                    ws.send(buf);
                }
            } else {
                // EOF - End of Frame
                const buf = Buffer.alloc(2);
                buf.writeUInt16LE(PatchType.EOF, 0);
                ws.send(buf);
            }
        } catch (error) {
            console.error('Error reading message:', error);
        }
    });
});
console.log(`WebSocket server running on port ${PORT}`);

async function refreshActiveImage({ id, width, height }: ConnectionInfo): Promise<boolean> {
    let image = getActiveImageForDevice(id) as Buffer;
    console.log(image);
    if (image && image.length > 0) {
        patchLists[id] = await getPatches(image, width, height);
        return true;
    }
    return false;
}