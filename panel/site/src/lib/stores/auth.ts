import { writable } from "svelte/store";
import { me } from "$lib/api/auth";

export interface User { id: string; username: string; role: string; }
export const user  = writable<User | null>(null);
export const ready = writable(false);

export async function loadUser() {
  try {
    const u = await me();
    user.set(u);
  } catch {
    user.set(null);
  } finally {
    ready.set(true);
  }
}
