import { Server } from 'ws';
import { IncomingMessage } from 'http';
import { browserManager } from './manager';
import { handleBrowserMessage } from './router';

export function setupBrowserWebSocketServer(wss: Server) {
  wss.on('connection', (ws, request: IncomingMessage) => {
    const client = browserManager.addClient(ws);

    ws.on('message', async (message: Buffer) => {
      await handleBrowserMessage(client, message.toString());
    });
  });

  browserManager.startHeartbeat();
}
