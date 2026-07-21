import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { setupBrowserWebSocketServer } from './browser';
import { randomBytes } from 'crypto';

// Generate an in-memory secret on every restart for JWTs
if (!process.env.RUNTIME_SECRET) {
  process.env.RUNTIME_SECRET = randomBytes(32).toString('hex');
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = parse(request.url!, true);
    if (parsedUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Attach Browser WS Logic
  setupBrowserWebSocketServer(wss);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Error starting Next.js custom server:", err);
  process.exit(1);
});
