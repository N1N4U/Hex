import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, createLogger } from 'vite';
import path from 'path';

const customLogger = createLogger();
const originalError = customLogger.error;
customLogger.error = (msg, options) => {
  if (typeof msg === 'string' && (msg.includes('ws proxy socket error') || msg.includes('ECONNRESET'))) {
    return; // Suppress spurious WS socket resets when backend is offline
  }
  originalError(msg, options);
};

export default defineConfig({
  plugins: [sveltekit()],
  customLogger,
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib')
    }
  },
  optimizeDeps: {
    include: [
      '@lucide/svelte',
      '@xterm/xterm',
      '@xterm/addon-fit',
      '@xterm/addon-web-links',
      'monaco-editor'
    ]
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend node offline or unreachable' }));
            }
          });
        }
      }
    }
  }
});
