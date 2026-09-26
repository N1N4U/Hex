import { writable } from "svelte/store";

export interface CoreStats {
  cpu:         number;
  mem_used:    number;
  mem_total:   number;
  disk_used:   number;
  disk_total:  number;
  uptime:      string;
  os_name:     string;
  cpu_model?:  string;
  cpu_cores?:  number;
  net_sent?:   number;
  net_recv?:   number;
}

export const stats    = writable<CoreStats | null>(null);
export const wsStatus = writable<"connected" | "disconnected" | "reconnecting">("disconnected");
