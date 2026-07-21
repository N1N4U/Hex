import WebSocket from 'ws';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { browserManager } from '../browser/manager';
import { WSMessage } from '../protocol/types';

// Helper to get SQLite DB to lookup cores
async function getDb() {
  return open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });
}

class CoreConnectionManager {
  private connections: Map<string, WebSocket> = new Map();

  public async getOrConnectCore(coreId: string): Promise<WebSocket | null> {
    let ws = this.connections.get(coreId);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      return ws;
    }

    return this.connectToCore(coreId);
  }

  private async connectToCore(coreId: string): Promise<WebSocket | null> {
    try {
      const db = await getDb();
      const node = await db.get('SELECT ip_address, port, protocol, api_key FROM nodes WHERE id = ?', [coreId]);
      if (!node) return null;

      const wsProtocol = node.protocol === 'https' ? 'wss' : 'ws';
      const coreUrl = `${wsProtocol}://${node.ip_address}:${node.port}/ws`;
      
      const coreWs = new WebSocket(coreUrl);

      return new Promise((resolve) => {
        coreWs.on('open', () => {
          console.log(`[WS] Connected to Core ${coreId}`);
          this.connections.set(coreId, coreWs);
          
          // Authenticate with core
          coreWs.send(JSON.stringify({
            type: 'auth',
            token: node.api_key
          }));

          resolve(coreWs);
        });

        coreWs.on('message', (msg: Buffer) => {
          this.handleCoreMessage(coreId, msg.toString());
        });

        coreWs.on('close', () => {
          console.log(`[WS] Disconnected from Core ${coreId}`);
          this.connections.delete(coreId);
        });

        coreWs.on('error', (err) => {
          console.error(`[WS] Error on Core ${coreId}:`, err.message);
          resolve(null);
        });
      });
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  private handleCoreMessage(coreId: string, message: string) {
    // Inject core_id so client knows where it came from
    let parsed: WSMessage;
    let finalMessage = message;
    
    try {
      parsed = JSON.parse(message);
      parsed.core_id = coreId; 
      finalMessage = JSON.stringify(parsed);
    } catch(e) {
      // Ignored
    }

    // Broadcast message from core to all authenticated browser connections
    // In a multi-user environment, we'd route this specifically to users watching this core
    browserManager.broadcast(finalMessage);
  }
}

export const coreManager = new CoreConnectionManager();
