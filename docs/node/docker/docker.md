# Hex Node — Docker Gateway & RBAC

> Hex Node acts as the secure API Gateway for Docker container management.

---

## 1. Responsibilities

- **Authentication & RBAC:** Verifies user identity via session cookie or JWT and enforces role permissions (`docker.manage`, `docker.view`).
- **Request Proxying:** Forwards validated Docker operations to Core via Unix socket (local) or mTLS/JWT (remote).
- **Log Streaming:** Proxies live container log streams from Core WebSocket to browser client WebSocket.
- **Audit Logging:** Every start, stop, restart, delete, or create operation is recorded with user ID, timestamp, and client IP.

---

## 2. Endpoints (Browser/Client $\rightarrow$ Node)

All Docker calls from the frontend go to:
- `GET /api/v1/core/docker/containers`: List containers
- `POST /api/v1/core/docker/action?id=<id>&action=<act>`: Container action
- `GET /api/v1/core/docker/images`: List images
- `GET /api/v1/core/docker/volumes`: List volumes
- `GET /api/v1/core/docker/networks`: List networks

Unauthorized requests receive `403 Forbidden` and are never forwarded to Core.
