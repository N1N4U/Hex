# Hex Core — Multi-Backend Firewall Manager

> Hex Core provides a unified firewall management abstraction supporting Linux distributions with UFW, Firewalld, nftables, or iptables.

---

## 1. Multi-Backend Detection

During startup or via `GET /firewall/detect`, Hex Core automatically scans the host system to determine the active firewall manager:

1. **Firewalld:** Checks `command -v firewall-cmd` and `systemctl is-active firewalld`. (Fedora, RHEL, CentOS, Rocky Linux, AlmaLinux)
2. **UFW:** Checks `command -v ufw` and service status. (Ubuntu, Debian)
3. **nftables:** Checks `command -v nft` and tables configuration. (Arch, CachyOS, Alpine)
4. **iptables:** Fallback for traditional Linux systems.

---

## 2. Unified Commands & API Endpoints

The Core exposes uniform endpoints regardless of which underlying backend is active:

| Endpoint | Method | Action |
|---|---|---|
| `/firewall` | `GET` | Return firewall status and active rules |
| `/firewall` | `POST` | Enable, disable, allow, deny, or remove rule |
| `/firewall/backend` | `GET` | Return current active backend name |

### Payload Format (`POST /firewall`)
```json
{
  "action": "allow",
  "port": 8080,
  "protocol": "tcp"
}
```

Supported actions:
- `enable` — Activates the firewall
- `disable` — Deactivates the firewall
- `allow` — Permits incoming traffic on specified port/protocol
- `deny` — Blocks incoming traffic on specified port/protocol
- `remove` — Deletes an existing rule
- `reload` — Reloads the firewall rule definitions

---

## 3. Port Safety & Defaults

- Port 22 (SSH) is **never** blocked automatically.
- Same-machine setups (`core` + `node` on same VPS) keep Core port 8080 closed externally, routing traffic via `/var/run/hex/core.sock`.
- Remote setup opens Core port 8080 exclusively to whitelisted Node IP addresses.
