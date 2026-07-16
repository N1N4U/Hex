# Hex

> **The modern Docker and Linux control panel for developers, VPS owners, and self-hosters.**

Hex is an open-source, lightweight, secure, and modern Linux management platform built around Docker. It acts as a unified platform for deployments, monitoring, networking, backups, and container orchestration.

## Architecture

Hex follows a strict separation of concerns, heavily prioritizing security and a Zero-Trust communication model:

- **Hex Panel (Next.js):** The management layer. It acts as a Backend-For-Frontend (BFF). It handles user authentication, RBAC, organizations, and the entire user interface.
- **Hex Core (Go):** The execution layer. A lightweight daemon running on the host that strictly executes authenticated requests. It handles Docker, the filesystem, firewalls, reverse proxies, and system-level operations.

The Panel and Core communicate via REST APIs and WebSockets, secured with **mTLS** (Mutual TLS) and short-lived **JWTs**. The Core blindly trusts authenticated requests coming from a trusted Panel and knows absolutely nothing about users or permissions.

## Features

- **Docker Container Management:** Complete control over Docker, including the ability to adopt existing unmanaged containers.
- **Hex Deployments (GitOps):** Automated deployments from Git providers (GitHub, GitLab, etc.) with support for Dockerfiles, Docker Compose, prebuilt images, and custom scripts.
- **Reverse Proxy Manager:** Natively edits and manages Nginx and Caddy config files for simple routing and SSL setups.
- **File Manager & Terminal:** WebSSH terminal and a VS Code-like Monaco editor file manager.
- **Secrets Manager:** Secure `.env` vault injected directly into containers at runtime.
- **Automated Cloud Backups:** Seamless backups for volumes, configs, and databases to local or S3-compatible cloud storage.

## Installation

Hex is designed to be installed with a single command on any supported Linux distribution (Ubuntu, Debian, Fedora, Rocky, AlmaLinux).

### Secure Setup (Recommended)
Installs both the Core and the Panel on the same machine, securing the Core to only listen locally.

```bash
curl -fsSL https://raw.githubusercontent.com/N1N4U/Hex/main/install.sh | sudo bash
```

### Advanced Setup
The installer also supports `Core Only` or `Panel Only` installations for multi-node clusters.

## Documentation

Full architectural and technical documentation is available in the [`docs/`](./docs) directory.

## Contributing

Hex is open-source. Please follow the architectural guidelines detailed in the `docs/Security.md` when contributing.
