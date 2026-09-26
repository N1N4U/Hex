# Hex Node — Firewall Gateway

> Hex Node provides authenticated, RBAC-protected firewall control.

---

## 1. Access Control

- Only users with the `owner` or `admin` role can modify firewall rules.
- Viewers can only view firewall status and rules list.
- Developers cannot open or close ports unless granted explicit custom permissions.

---

## 2. Endpoints (Client $\rightarrow$ Node)

- `GET /api/v1/core/firewall`: Retrieve current rules and backend status.
- `POST /api/v1/core/firewall`: Apply a rule (allow, deny, remove).
  - Node validates request format before proxying to Core.
  - Node records an audit log entry on rule changes.
