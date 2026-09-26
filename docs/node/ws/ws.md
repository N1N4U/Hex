# Hex Node — WebSocket Hub Architecture

> This document details the WebSocket connection management and proxy hub in Hex Node.

---

## 1. Overview

Hex Node acts as a WebSocket hub:
```
Browser / Client (WSS) <───> Hex Node (WS Hub) <───> Hex Core (WS)
```

No client ever establishes a direct WebSocket connection to Core.

---

## 2. Handshake Authentication

Before upgrading the HTTP connection to WebSocket, Node verifies authentication:
1. **Browser Clients:** Reads the `hex_access` HttpOnly cookie.
2. **Mobile / Bot Clients:** Reads the `?token=<access_token>` query parameter.
3. Validates token signature (HS256) and expiration.
4. If missing or invalid, connection is rejected with `401 Unauthorized`.

---

## 3. Core Connection Bridging

After client upgrade:
- **Same-Machine Mode:** Dials Core over Unix domain socket `/var/run/hex/core.sock`.
- **Remote Mode:** Dials Core over HTTP/HTTPS with `Authorization: Bearer <core_jwt>` header.
- Bridges incoming client messages to Core and relays Core messages back to client concurrently.
