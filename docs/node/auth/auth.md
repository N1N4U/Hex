# Hex Node — Authentication

> This document describes the authentication system implemented in `panel/node/`.

---

# Overview

`node` is responsible for ALL user authentication. `core` never handles user auth.

| Flow | Method |
|---|---|
| Browser login | POST /api/v1/auth/login → access_token (15 min JWT) + refresh_token (30 days, opaque) |
| Token storage | HttpOnly Secure cookies (browser). Authorization header (mobile/bot) |
| Token refresh | POST /api/v1/auth/refresh — rotates refresh_token |
| Logout | POST /api/v1/auth/logout — invalidates refresh_token |
| Initial setup | POST /api/v1/auth/setup — creates first owner (only when 0 users exist) |
| Session me | GET /api/v1/auth/me — returns current user info |

# Password Hashing

All passwords use **Argon2id** (never bcrypt, never MD5, never plaintext).

Parameters: `m=65536, t=1, p=4, keyLen=32`

# JWT (Access Token)

```json
{
  "sub": "user_id",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700000900
}
```

- Signed with HS256 using `HEX_NODE_JWT_SECRET`
- Valid 15 minutes
- Stored in `hex_access` HttpOnly cookie

# Refresh Token

- Opaque random string (`hex_rt_<64-hex-chars>`)
- Stored in SQLite `sessions` table
- Valid 30 days
- Single-use: each refresh rotates it
- Stored in `hex_refresh` HttpOnly cookie (Path: /api/v1/auth/refresh)

# Initial Setup

When no users exist, `POST /api/v1/auth/setup` creates the first owner account.
Password must be ≥ 12 characters.

# Cookie Security

```
hex_access:  HttpOnly, Secure (in prod), SameSite=Lax, Path=/, MaxAge=900
hex_refresh: HttpOnly, Secure (in prod), SameSite=Lax, Path=/api/v1/auth/refresh, MaxAge=2592000
```

In dev mode (`HEX_DEV=true`) the Secure flag is relaxed for HTTP.