import { post, get } from "./client";

export interface AuthUser { id: string; username: string; role: string; }

export const login  = (username: string, password: string) =>
  post<{ ok: boolean; role: string }>("/auth/login", { username, password });

export const logout = () => post<{ ok: boolean }>("/auth/logout");
export const refresh = () => post<{ ok: boolean }>("/auth/refresh");
export const me      = () => get<AuthUser>("/auth/me");
export const setup   = (username: string, password: string) =>
  post<{ ok: boolean }>("/auth/setup", { username, password });
