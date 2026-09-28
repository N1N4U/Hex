// Base HTTP client ? all requests go to node, never to core directly.

const BASE = '/api/v1';

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 3500): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // send HttpOnly cookies
      signal: controller.signal
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

export const get  = <T>(path: string, timeoutMs?: number)                => request<T>('GET',    path, undefined, timeoutMs);
export const post = <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('POST',   path, body, timeoutMs);
export const put  = <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('PUT',    path, body, timeoutMs);
export const del  = <T>(path: string, timeoutMs?: number)                => request<T>('DELETE', path, undefined, timeoutMs);
