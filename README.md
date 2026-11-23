<div align="center">

# Hex

> **The modern, high-performance Docker and Linux server management platform.**

[![GitHub Release](https://img.shields.io/github/v/release/N1N4U/Hex?color=e2e8f0&label=Release&style=flat-square)](https://github.com/N1N4U/Hex/releases)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg?style=flat-square)](https://github.com/N1N4U/Hex)
[![Platform](https://img.shields.io/badge/Platform-Linux%20(amd64%20%7C%20arm64)-0a0c0f.svg?style=flat-square)](https://github.com/N1N4U/Hex)

</div>

---

Hex is a high-performance, secure, and unified Linux server control panel built around Docker. Designed from the ground up with a ServerOS aesthetic (Graphite Noir & Glacier Silver), Hex empowers developers, VPS owners, and system administrators to manage containers, reverse proxies, system metrics, terminal sessions, and cluster nodes through a fast, lightweight interface.

---

## ⚡ Quick Start / Installation

Hex installs with a single command on any supported Linux distribution. The automated installer configures dependencies, sets up systemd services, and generates secure certificates automatically.

```bash
curl -fsSL https://raw.githubusercontent.com/N1N4U/Hex/main/install.sh | sudo bash
```

### Installation Options
During installation, you can select your deployment role:
* **Option 1: Core Only** — Lightweight daemon for remote worker nodes.
* **Option 2: Panel Only** — Standalone management panel connecting to external Core nodes.
* **Option 3: Core + Panel** — Standard single-machine installation.
* **Option 4: Core + Panel (Secure Mode)** — Core locked strictly to loopback (`127.0.0.1`), accessible only via the local panel.

---

## 🏗️ Architecture

Hex follows a strict Zero-Trust decoupled architecture:

* **Hex Panel (SvelteKit + Go):** The management and orchestration layer. Provides real-time metrics, interactive terminal emulation, Docker management, and system configuration.
* **Hex Core (Go Daemon):** An ultra-lean, low-overhead agent running directly on the Linux host. Executes container operations, filesystem interactions, reverse proxy configurations, and system telemetry.
* **Mutual TLS (mTLS):** All communication between Panel instances and Core nodes is strictly encrypted and authenticated via mTLS and short-lived tokens.

---

## ✨ Key Features

* **🐳 Docker Management:** Inspect, start, stop, restart, monitor, and deploy containers with real-time log streaming and stats. Supports adopting existing unmanaged host containers.
* **🌐 Reverse Proxy Integration:** Native configuration and reload support for Nginx and Caddy with automatic SSL certificates.
* **💻 Web Terminal & File Management:** Low-latency WebSSH terminal sessions and an integrated browser-based file manager with editor capabilities.
* **📊 Host Telemetry & Top Processes:** Real-time CPU, RAM, disk I/O, and network metrics with instant process inspection and kill actions.
* **🛡️ Built-in Security:** UFW / firewall automation, brute-force rate limiting, and dual-layer audit logging.
* **📦 Preset Catalog:** 100+ curated one-click templates for databases, media servers, developer tools, AI engines, and productivity apps.

---

## 🖥️ Supported Operating Systems

* **Ubuntu** 20.04 LTS / 22.04 LTS / 24.04 LTS
* **Debian** 11 / 12
* **Fedora** 38 / 39 / 40
* **Rocky Linux / AlmaLinux** 8 / 9

**Minimum Requirements:**
* **RAM:** 512 MB (1 GB recommended)
* **Disk:** 500 MB free space
* **Architecture:** `x86_64` (amd64) or `aarch64` (arm64)

---

## 💬 Community & Support

* **Issues & Bug Reports:** [GitHub Issues](https://github.com/N1N4U/Hex/issues)
* **Discussions:** [GitHub Discussions](https://github.com/N1N4U/Hex/discussions)

---

## 📄 License & Terms

Hex binaries are free to use for personal and commercial server management. All rights reserved by [N1N4U](https://github.com/N1N4U).
