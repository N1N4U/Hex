# Hex Communication Specification

> Defines communication protocols, transports, and authentication between Hex components.

---

## 1. Client $\rightarrow$ Node

- **Protocol:** HTTPS / HTTP + WSS / WS
- **Port:** Default 9000 (configurable via `HEX_NODE_PORT` or `PORT`)
- **Authentication:** HttpOnly Secure cookie (`hex_access`) or Bearer JWT header
- **Base URL:** `/api/v1/`

---

## 2. Node $\rightarrow$ Core

### Same Machine (Default / Standalone)
- **Transport:** Unix Domain Socket `/var/run/hex/core.sock`
- **Authentication:** OS filesystem permissions. Core opens no external network port.

### Remote Machine
- **Mode A (Secure):** HTTPS + mTLS certificate (`panel.crt` / `core.crt`) + JWT header + IP Whitelist.
- **Mode B (Private Dev / LAN):** HTTP + JWT header + IP Whitelist.
