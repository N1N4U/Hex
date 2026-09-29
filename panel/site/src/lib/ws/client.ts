// WebSocket client — connects to node WS proxy and tracks live latencies.

import { pingStore, stats } from '../stores/core';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingIntervalTimer: ReturnType<typeof setInterval> | null = null;
let apiPingTimer: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;
const listeners = new Map<string, Set<(data: unknown) => void>>();

export function connect() {
  if (typeof window === 'undefined') return;
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${location.host}/api/v1/ws`;

  try {
    socket = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    reconnectAttempts = 0;
    emit('__status__', 'connected');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // 1. Start WS ping loop (measures Node - site WS ping)
    if (pingIntervalTimer) clearInterval(pingIntervalTimer);
    pingIntervalTimer = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping', id: `ping_${Date.now()}` }));
      }
    }, 4000);

    // Initial ping
    socket.send(JSON.stringify({ type: 'ping', id: `ping_${Date.now()}` }));

    // 2. Start HTTP ping loop (measures Node - site API ping)
    measureSiteApiPing();
    if (apiPingTimer) clearInterval(apiPingTimer);
    apiPingTimer = setInterval(measureSiteApiPing, 8000);
  };

  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);

      // Handle Node-site WS Pong
      if (msg.type === 'pong' && typeof msg.id === 'string' && msg.id.startsWith('ping_')) {
        const sentTime = parseInt(msg.id.split('_')[1], 10);
        if (!isNaN(sentTime)) {
          const latency = Math.max(1, Date.now() - sentTime);
          pingStore.update((p) => ({ ...p, siteWsPing: latency }));
        }
        return;
      }

      // Handle Core-Node latency broadcast
      if (msg.type === 'pings') {
        pingStore.update((p) => ({
          ...p,
          coreApiPing: typeof msg.core_api_ping === 'number' ? msg.core_api_ping : p.coreApiPing,
          coreWsPing: typeof msg.core_ws_ping === 'number' ? msg.core_ws_ping : p.coreWsPing,
        }));
        return;
      }

      // Handle Telemetry Update from Core
      if (msg.type === 'stats.update' || msg.type === 'stats') {
        const payload = msg.payload || msg.data || msg;
        stats.set(payload);
        emit('stats.update', payload);
        emit('stats', payload);
        return;
      }

      // Handle Storage Update from Core
      if (msg.type === 'storage.update') {
        const storagePayload = msg.payload || msg.data || msg;
        stats.update((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            partitions: storagePayload.partitions || prev.partitions,
            docker_images_size: storagePayload.docker_images_size,
            docker_logs_size: storagePayload.docker_logs_size,
            docker_storage_size: storagePayload.docker_storage_size,
          };
        });
        emit('storage.update', storagePayload);
        return;
      }

      if (msg.type) {
        emit(msg.type, msg);
      }
    } catch {
      /* ignore non-JSON */
    }
  };

  socket.onclose = () => {
    emit('__status__', 'disconnected');
    pingStore.update((p) => ({ ...p, siteWsPing: -1, coreWsPing: -1 }));
    if (pingIntervalTimer) {
      clearInterval(pingIntervalTimer);
      pingIntervalTimer = null;
    }
    if (apiPingTimer) {
      clearInterval(apiPingTimer);
      apiPingTimer = null;
    }
    scheduleReconnect();
  };

  socket.onerror = () => {
    socket?.close();
  };
}

async function measureSiteApiPing() {
  try {
    const t0 = performance.now();
    const res = await fetch('/api/v1/config/public', { cache: 'no-store' });
    if (res.ok) {
      const latency = Math.max(1, Math.round(performance.now() - t0));
      pingStore.update((p) => ({ ...p, siteApiPing: latency }));
    }
  } catch {
    pingStore.update((p) => ({ ...p, siteApiPing: -1 }));
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(15000, 2000 * Math.pow(1.5, Math.min(reconnectAttempts, 5)));
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (pingIntervalTimer) {
    clearInterval(pingIntervalTimer);
    pingIntervalTimer = null;
  }
  if (apiPingTimer) {
    clearInterval(apiPingTimer);
    apiPingTimer = null;
  }
  reconnectAttempts = 0;
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
  listeners.get(type)?.forEach((fn) => fn(data));
}
