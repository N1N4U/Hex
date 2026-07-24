import WebSocket, { WebSocketServer } from 'ws';
import { getDb } from '../../database';
import { IncomingMessage } from 'http';
import { parse } from 'url';

export function setupTerminalWebSocketServer(wss: WebSocketServer) {
  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    const { query } = parse(request.url || '', true);
    const coreId = query.coreId as string;

    if (!coreId) {
      ws.close(1008, 'coreId is required');
      return;
    }

    try {
      const db = await getDb();
      const nodeRow = await db.get('SELECT ip_address, port, protocol, api_key FROM nodes WHERE id = ?', [Number(coreId)]);

      if (!nodeRow) {
        ws.close(1008, 'Core not found');
        return;
      }

      const wsProtocol = nodeRow.protocol === 'https' ? 'wss' : 'ws';
      const targetUrl = `${wsProtocol}://${nodeRow.ip_address}:${nodeRow.port}/terminal`;

      console.log(`[Terminal Proxy] Connecting to core at ${targetUrl}`);

      // Connect to Core Terminal WS
      const coreWs = new WebSocket(targetUrl, {
        headers: {
          Authorization: `Bearer ${nodeRow.api_key}`
        }
      });

      coreWs.on('open', () => {
        console.log(`[Terminal Proxy] Connected to core ${coreId}`);
      });

      // Stream Core -> Browser
      coreWs.on('message', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Stream Browser -> Core
      ws.on('message', (data) => {
        if (coreWs.readyState === WebSocket.OPEN) {
          coreWs.send(data);
        }
      });

      coreWs.on('close', () => {
        console.log(`[Terminal Proxy] Core ${coreId} connection closed`);
        if (ws.readyState === WebSocket.OPEN) ws.close();
      });

      coreWs.on('error', (err) => {
        console.error(`[Terminal Proxy] Core ${coreId} error:`, err);
        if (ws.readyState === WebSocket.OPEN) ws.close();
      });

      ws.on('close', () => {
        if (coreWs.readyState === WebSocket.OPEN) coreWs.close();
      });

    } catch (err) {
      console.error('[Terminal Proxy] Error setting up terminal connection:', err);
      ws.close(1011, 'Internal Server Error');
    }
  });
}
