# Hex Panel Directory Structure

> Official layout for the `panel/` directory.

---

```
panel/
├── node/                  ← Go Backend (BFF, auth, API, WS, serves site)
│   ├── main.go
│   ├── config/config.go
│   ├── server/            ← Server, router, and middleware
│   ├── auth/              ← Session, JWT, Argon2id password
│   ├── api/               ← Auth endpoints, core proxy, WS proxy
│   ├── core/              ← Core client & transport auto-detection
│   ├── users/             ← SQLite users & sessions store
│   ├── rbac/              ← Roles and permission checks
│   ├── audit/             ← Audit logger
│   └── static/            ← Embedded Svelte dist (via go:embed)
└── site/                  ← Svelte 5 UI (compiled to static dist)
    ├── package.json
    ├── svelte.config.js
    ├── vite.config.js
    └── src/
        ├── app.html
        ├── app.css        ← Material 3 tokens & glassmorphism
        ├── lib/           ← API client, WS client, stores
        └── routes/        ← SvelteKit routes (+layout, login, home, docker, etc.)
```
