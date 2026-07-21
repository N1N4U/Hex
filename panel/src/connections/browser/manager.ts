import WebSocket from 'ws';

export interface BrowserClient {
  ws: WebSocket;
  isAuthenticated: boolean;
  isAlive: boolean;
}

class BrowserConnectionManager {
  private clients: Set<BrowserClient> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  public addClient(ws: WebSocket): BrowserClient {
    const client: BrowserClient = { ws, isAuthenticated: false, isAlive: true };
    this.clients.add(client);
    
    ws.on('pong', () => { client.isAlive = true; });
    
    ws.on('close', () => {
      this.removeClient(client);
    });

    return client;
  }

  public removeClient(client: BrowserClient) {
    this.clients.delete(client);
  }

  public startHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.clients.forEach(client => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.removeClient(client);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);
  }

  public stopHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  // Broadcast to all authenticated browser clients
  public broadcast(message: string) {
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN && client.isAuthenticated) {
        client.ws.send(message);
      }
    });
  }
}

export const browserManager = new BrowserConnectionManager();
