# Hex Node — API Reference

> All client-facing API routes exposed by `panel/node/`.

---

# Base URL

```
http(s)://<panel-domain>/api/v1/
```

# Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/v1/auth/login | None | Login with username+password |
| POST | /api/v1/auth/logout | Cookie | Logout, invalidate refresh token |
| POST | /api/v1/auth/refresh | Refresh cookie | Get new access token |
| POST | /api/v1/auth/setup | None (first-run only) | Create initial owner account |
| GET  | /api/v1/auth/me | Access token | Get current user info |

# Core Proxy

All core endpoints are proxied under `/api/v1/core/*`:

```
GET  /api/v1/core/stats         → GET  /stats   on core
GET  /api/v1/core/health        → GET  /health  on core
GET  /api/v1/core/docker/containers → ...
POST /api/v1/core/docker/action → ...
...etc (all core endpoints)
```

Requires valid access token. Node verifies auth + RBAC before forwarding.

# WebSocket

```
WS /api/v1/ws
```

Requires access token (cookie or ?token= query param).
Node bridges this to core's `/ws` WebSocket.

# Rate Limiting

Login endpoint: max 10 requests per IP per 60 seconds.