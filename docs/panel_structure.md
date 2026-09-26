# Hex Panel Directory Structure

> Official layout for the `panel/` directory.

---

```
panel/
??? node/                  ? Go Backend (BFF, auth, API, WS, serves site)
?   ??? main.go
?   ??? settings.json      ? Panel settings (Port, Basic, MasterAuth, OAuth, Databases)
?   ??? config/config.go   ? Settings loader & parser
?   ??? coredb/            ? Core database store (data/hex-core.db: metrics, logs, events)
?   ??? users/             ? Node database store (data/hex-node.db: users, sessions, nodes, activities)
?   ??? server/            ? Server, router, and middleware
?   ??? auth/              ? Session, JWT, Argon2id password
?   ??? api/               ? Auth endpoints, core proxy, WS proxy, nodes & activities
?   ??? core/              ? Core client & transport auto-detection
?   ??? rbac/              ? Roles and permission checks
?   ??? audit/             ? Audit logger
?   ??? static/            ? Embedded Svelte dist (via go:embed all:dist)
??? site/                  ? Svelte 5 UI (compiled to static dist)
    ??? package.json
    ??? svelte.config.js
    ??? vite.config.js
    ??? src/
        ??? app.html
        ??? app.css        ? Material 3 tokens & glassmorphism
        ??? lib/           ? API client, WS client, stores
        ??? routes/        ? SvelteKit routes (+layout, login, home, docker, etc.)
```

### Databases
1. **Core Database (`data/hex-core.db`)**:
   - `system_metrics`: Historical CPU, RAM, Disk, and Network metrics for graph rendering.
   - `container_logs`: Container stdout/stderr console logs.
   - `system_events`: Server events and lifecycle notifications.

2. **Node Database (`data/hex-node.db`)**:
   - `users`: User credentials, master user, and role assignments.
   - `sessions`: Active login sessions and JWT refresh tokens.
   - `nodes`: Registered VPS Core instances.
   - `activity_logs`: Audit trail of actions performed through the panel.
