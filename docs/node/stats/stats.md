# Hex Node — Metrics & Live Stats Gateway

> Node provides live telemetry from Core to browsers and mobile clients.

---

## 1. Transports

1. **REST Snapshot:** `GET /api/v1/core/stats`
   - Returns instantaneous CPU %, RAM usage, Disk usage, Network speed, OS uptime.
2. **WebSocket Stream:** `WS /api/v1/ws`
   - Real-time continuous broadcast for dashboard gauges and charts.
   - Handshake authenticated via `hex_access` HttpOnly cookie or token param.

---

## 2. Security

- Clients never query Core directly for metrics.
- Unauthenticated WebSocket connections are closed immediately.
