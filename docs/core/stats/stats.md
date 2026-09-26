# Hex Core — System Monitor & Metrics

> Core monitors host and container resource utilization in real time using kernel interfaces.

---

## 1. Metrics Collection

Core gathers system metrics without shelling out to external processes:
- **CPU:** Read from `/proc/stat` and aggregated across all cores.
- **Memory:** Read directly from `/proc/meminfo` (`MemTotal`, `MemAvailable`, `MemFree`, `Buffers`, `Cached`).
- **Disk:** Calculated via `statvfs` on mounted filesystems.
- **Network I/O:** Delta counters parsed from `/proc/net/dev`.
- **System Info:** Hostname, OS distribution, kernel version, and system uptime.

---

## 2. API Endpoints

- `GET /stats`: Returns an instant snapshot of system CPU, RAM, disk, and network stats.
- `GET /stats/stream`: Server-Sent Events (SSE) stream broadcasting system stats every second.
- `WS /ws`: Full bidirectional WebSocket connection streaming live metrics and logs.

---

## 3. Memory & Resource Efficiency

- Core limits memory footprint by avoiding unbounded process buffers.
- PID leak protection: processes that terminate are pruned immediately after data collection.
