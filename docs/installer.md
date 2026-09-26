# Hex Installer Specification

> Documentation for the single-command installer (`install.sh`).

---

## 1. Single Command Install

```bash
curl -fsSL https://raw.githubusercontent.com/N1N4U/Hex/main/install.sh | sudo bash
```

---

## 2. Supported Modes

- **Mode 1: Core Only** — Installs `hex-core` and CLI. For multi-node setups where this server is managed remotely.
- **Mode 2: Panel Only** — Installs `hex-panel` (Node + Site) and CLI. Connects to existing remote Core instances.
- **Mode 3: Core + Panel (Same VPS)** — **Recommended**. Installs both `hex-core` and `hex-panel`. Communicates over `/var/run/hex/core.sock`.
- **Mode 4: Core + Panel (Multi-Server)** — Installs both, allowing external panel connections.

---

## 3. Assets & Releases

Binaries are downloaded from GitHub Releases `latest`:
- `hex-core-linux-amd64`
- `hex-panel-linux-amd64`
