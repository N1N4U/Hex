import WebSocket, { WebSocketServer } from 'ws';
import { getDb } from '../../database';
import { IncomingMessage } from 'http';
import { parse } from 'url';

export function setupDockerExecWebSocketServer(wss: WebSocketServer) {
  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    const { query } = parse(request.url || '', true);
    const coreId = query.coreId as string;
    const containerId = query.containerId as string;

    if (!coreId || !containerId) {
      ws.close(1008, 'coreId and containerId are required');
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
      const targetUrl = `${wsProtocol}://${nodeRow.ip_address}:${nodeRow.port}/docker/exec?containerId=${containerId}`;

      const coreWs = new WebSocket(targetUrl, {
        headers: {
          Authorization: `Bearer ${nodeRow.api_key}`
        }
      });

      coreWs.on('message', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      ws.on('message', (data) => {
        if (coreWs.readyState === WebSocket.OPEN) {
          coreWs.send(data);
        }
      });

      coreWs.on('close', () => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      });

      coreWs.on('error', () => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      });

      ws.on('close', () => {
        if (coreWs.readyState === WebSocket.OPEN) coreWs.close();
      });

    } catch (err) {
      ws.close(1011, 'Internal Server Error');
    }
  });
}
