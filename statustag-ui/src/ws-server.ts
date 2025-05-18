import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { IncomingMessage } from 'http';

const PORT = 8080;

interface ConnectionInfo {
    id: string;
    width: number;
    height: number;
}

// Extend WebSocket to include connectionInfo
interface AppWebSocket extends WebSocket {
    connectionInfo?: ConnectionInfo;
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const { query } = url.parse(req.url || '', true);
    const id = typeof query.id === 'string' ? query.id : '';
    const width = typeof query.width === 'string' ? parseInt(query.width, 10) : NaN;
    const height = typeof query.height === 'string' ? parseInt(query.height, 10) : NaN;

    // Reject connection if any required parameter is missing or invalid
    if (!id || isNaN(width) || isNaN(height)) {
        ws.send('Connection rejected - missing required parameters');
        ws.close(1008, 'Missing required parameters');
        console.log('Connection rejected - missing required parameters');
        return;
    }

    const appWs = ws as AppWebSocket;
    appWs.connectionInfo = { id, width, height };

    console.log('New connection:', { id, width, height });

    ws.on('message', (message: Buffer) => {
        console.log(`Received from [${id}]:`, message.toString());
    });
});

console.log(`WebSocket server running on port ${PORT}`);
