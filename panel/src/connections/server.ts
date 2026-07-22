import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { setupBrowserWebSocketServer } from './browser';
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

  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = parse(request.url!, true);
    if (parsedUrl.pathname === '/ws') {
      // Our custom WebSocket for browser ↔ panel communication
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // For all other paths (Next.js HMR at /_next/webpack-hmr, etc.)
    // do NOT destroy the socket — Next.js attaches its own upgrade listener
    // to handle those connections internally.
  });

  // Attach Browser WS Logic
  setupBrowserWebSocketServer(wss);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
