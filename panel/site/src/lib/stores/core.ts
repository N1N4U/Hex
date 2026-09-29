import { writable } from "svelte/store";

export interface Partition {
  device: string;
  mountpoint: string;
  total: number;
  used: number;
  used_percent: number;
}

export interface CoreStats {
  cpu_usage?: number;
  cpu_percent?: number;
  cpu?: number;
  cpu_cores?: number;
  cpu_model?: string;
  mem_used?: number;
  mem_total?: number;
  mem_usage?: number;
  disk_used?: number;
  disk_total?: number;
  disk_usage?: number;
  uptime?: number | string;
  os_name?: string;
  host_ip?: string;
  ip_address?: string;
  net_sent?: number;
  net_recv?: number;
  net_total_sent?: number;
  net_total_recv?: number;
  partitions?: Partition[];
}

export interface PingStats {
  coreApiPing: number;
  coreWsPing: number;
  siteApiPing: number;
  siteWsPing: number;
}

export const stats = writable<CoreStats | null>(null);
export const wsStatus = writable<"connected" | "disconnected" | "reconnecting">("disconnected");
export const pingStore = writable<PingStats>({
  coreApiPing: -1,
  coreWsPing: -1,
  siteApiPing: -1,
  siteWsPing: -1
});
