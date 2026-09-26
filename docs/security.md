# Hex Security Architecture

> Specification for authentication, transport security, and responsibility boundaries.

---

## 1. Core Principles

1. **Zero Client Trust:** Browsers, mobile apps, and bots never communicate with `core` directly.
2. **Component Separation:** `core` owns system execution; `node` owns authentication and authorization.
3. **Internal Transport Priority:** When `core` and `node` reside on the same machine, they communicate via Unix domain socket `/var/run/hex/core.sock` with file permission protection (`0600`/`0666`).
4. **Argon2id Passwords:** User credentials use Argon2id hashing exclusively.
5. **Short-Lived JWTs:** Access tokens expire after 15 minutes. Refresh tokens expire after 30 days and rotate on use.
6. **Path Traversal & Injection Hardening:** File paths, domains, and firewall commands undergo strict regex sanitization and validation.
