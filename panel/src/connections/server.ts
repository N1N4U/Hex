import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { setupBrowserWebSocketServer } from './browser';
import { setupTerminalWebSocketServer } from './terminal';
import { getDb } from '../../database';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function main() {
  // Initialize DB first — this loads the persistent JWT_SECRET so tokens
  // stay valid across server restarts / hot-reloads during development.
  await getDb();

  await app.prepare();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });
  const terminalWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = parse(request.url!, true);
    if (parsedUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (parsedUrl.pathname === '/ws/terminal') {
      terminalWss.handleUpgrade(request, socket, head, (ws) => {
        terminalWss.emit('connection', ws, request);
      });
    }
  });

  // Attach Handlers
  setupBrowserWebSocketServer(wss);
  setupTerminalWebSocketServer(terminalWss);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
