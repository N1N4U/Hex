// WebSocket client — connects to node WS proxy, never to core directly.

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Map<string, Set<(data: unknown) => void>>();

export function connect() {
  if (socket?.readyState === WebSocket.OPEN) return;

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/api/v1/ws`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    emit("__status__", "connected");
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  };

  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type) emit(msg.type, msg);
    } catch { /* ignore non-JSON */ }
  };

  socket.onclose = () => {
    emit("__status__", "disconnected");
    reconnectTimer = setTimeout(connect, 3000);
  };

  socket.onerror = () => { socket?.close(); };
}

export function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
}

export function send(data: unknown) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

export function on(type: string, fn: (data: unknown) => void) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(fn);
  return () => listeners.get(type)?.delete(fn);
}

function emit(type: string, data: unknown) {
  listeners.get(type)?.forEach(fn => fn(data));
}
