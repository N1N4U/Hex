# Hex Documentation

> The modern Docker and Linux control panel for developers, VPS owners, and self-hosters.

---

## 1. Overview

Hex is an open-source, lightweight Linux and Docker management control panel built with high performance and security in mind.

### Core Components
1. **`hex-core` (Go):** Runs natively on the VPS host as a systemd service. Executes Docker, system, firewall, proxy, and monitoring operations. Never exposed directly to untrusted clients.
2. **`hex-node` (Go):** The Backend-For-Frontend (BFF). Manages user authentication, sessions (HttpOnly cookies), RBAC, audit logs, rate limiting, and proxies requests to Core. Embeds and serves the static UI.
3. **`hex-site` (Svelte 5):** The client-side UI built with Svelte 5 and TailwindCSS v4. Compiles into static files (`dist/`) and is embedded directly inside the `hex-node` binary. No Node.js runtime needed in production.
4. **`hex` CLI (Shell / Go):** System administrative CLI installed at `/usr/local/bin/hex`.

---

## 2. Technology Matrix

| Component | Language / Framework | Runs As | Storage |
|---|---|---|---|
| `core` | Go (1.21+) | systemd service (`hex-core`) | `/var/lib/hex/` |
| `node` | Go (1.21+) | systemd service (`hex-panel`) | `/opt/hex/panel/data/` |
| `site` | Svelte 5 + Vite | Embedded in `node` binary | Static asset embed |
| `presets` | JSON templates | Host filesystem | `/var/lib/hex/presets/` |
