# Hex Core — Reverse Proxy (Nginx) Architecture

> Hex Core directly manages host reverse proxy configurations with strict security isolation and validation.

---

## 1. Configuration Isolation

- Core writes configuration files exclusively to `/etc/nginx/conf.d/` or `/var/lib/hex/nginx_confs/`.
- Hex never overwrites `/etc/nginx/nginx.conf` directly.
- Each managed domain or container gets its own isolated configuration file: `<domain>.conf`.

---

## 2. Security & Injection Hardening

To prevent directory traversal or config injection:
1. **Domain Sanitization:** Strict regex validation allows only valid domain patterns (`^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`).
2. **Target Validation:** Upstream IP and port strings are strictly checked before injection.
3. **Config Testing:** Before reloading Nginx, Core runs `nginx -t`. If validation fails, the change is rolled back immediately and Nginx is not reloaded.
4. **Path Traversal Guards:** File paths are sanitized; `..` and special characters are rejected.

---

## 3. Endpoints

- `GET /proxy`: Lists all active proxy configurations and their status.
- `POST /proxy`: Creates or updates a reverse proxy host.
  - Supports WebSocket upgrade headers (`Upgrade $http_upgrade`, `Connection "upgrade"`).
  - Supports SSL via Let's Encrypt / custom certificates.
- `DELETE /proxy`: Removes the proxy file and reloads Nginx.
