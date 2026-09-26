# Hex Node — Reverse Proxy Gateway

> Hex Node proxies and manages proxy hosts, domain mappings, and SSL configurations.

---

## 1. Features

- **RBAC Validation:** Requires `admin` or `owner` privileges to add or modify proxy rules.
- **Validation:** Ensures domain names match valid patterns before dispatching to Core.
- **Status Reporting:** Relays Nginx configuration status and health reports to the UI.

---

## 2. Endpoints

- `GET /api/v1/core/proxy`: List proxy configurations.
- `POST /api/v1/core/proxy`: Create or update proxy rule.
- `DELETE /api/v1/core/proxy`: Delete proxy rule.
