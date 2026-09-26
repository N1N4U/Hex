// Base HTTP client — all requests go to node, never to core directly.

const BASE = "/api/v1";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include", // send HttpOnly cookies
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const get  = <T>(path: string)                => request<T>("GET",    path);
export const post = <T>(path: string, body?: unknown) => request<T>("POST",   path, body);
export const put  = <T>(path: string, body?: unknown) => request<T>("PUT",    path, body);
export const del  = <T>(path: string)                => request<T>("DELETE", path);
