const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');
const crypto = require('crypto');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const jwt = require('jose');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Store active core connections: Map<coreId, WebSocket>
const coreConnections = new Map();
// Store active browser connections: Set<WebSocket>
const browserConnections = new Set();

// Helper to get SQLite DB to lookup cores
async function getDb() {
  return open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
  });
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = parse(request.url, true);
    if (parsedUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    ws.isAlive = true;
    ws.isAuthenticated = false;
    browserConnections.add(ws);
    
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        return ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      }

      // Handle Authentication
      if (data.type === 'auth') {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_change_in_production');
          await jwt.jwtVerify(data.token, secret);
          ws.isAuthenticated = true;
          ws.send(JSON.stringify({ id: data.id, type: 'auth', success: true }));
        } catch (e) {
          ws.send(JSON.stringify({ id: data.id, type: 'auth', error: 'Authentication failed' }));
          ws.close();
        }
        return;
      }

      if (!ws.isAuthenticated) {
        return ws.send(JSON.stringify({ id: data.id, error: 'Not authenticated' }));
      }

      // Route requests to specific cores based on target_core_id
      if (data.target_core_id) {
        const coreId = data.target_core_id.toString();
        let coreWs = coreConnections.get(coreId);

        // Auto-connect to core if not connected
        if (!coreWs || coreWs.readyState !== WebSocket.OPEN) {
          coreWs = await connectToCore(coreId, ws);
          if (!coreWs) {
             return ws.send(JSON.stringify({ id: data.id, error: 'Could not connect to Core' }));
          }
        }

        // Forward to Core
        coreWs.send(JSON.stringify(data));
      } else {
         // Panel-level requests
         ws.send(JSON.stringify({ id: data.id, error: 'No target_core_id specified' }));
      }
    });

    ws.on('close', () => {
      browserConnections.delete(ws);
    });
  });

  // Heartbeat for browser connections
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Connect to Core WS Helper
  async function connectToCore(coreId, browserWs) {
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
          coreConnections.set(coreId, coreWs);
          
          // Authenticate with core
          coreWs.send(JSON.stringify({
            type: 'auth',
            token: node.api_key
          }));

          resolve(coreWs);
        });

        coreWs.on('message', (msg) => {
          // Broadcast message from core to all authenticated browser connections
          // Note: Add logic to filter by target_core_id if clients only want specific core data
          browserConnections.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.isAuthenticated) {
              try {
                const parsed = JSON.parse(msg.toString());
                parsed.core_id = coreId; // Inject core_id so client knows where it came from
                client.send(JSON.stringify(parsed));
              } catch(e) {
                client.send(msg.toString());
              }
            }
          });
        });

        coreWs.on('close', () => {
          console.log(`[WS] Disconnected from Core ${coreId}`);
          coreConnections.delete(coreId);
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

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
