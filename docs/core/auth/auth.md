# Hex Authentication

> This document defines all authentication flows for Hex.
>
> This document must be read alongside `security.md` and `communication.md`.
>
> Any AI assistant or developer working on Hex must follow this specification.

---

# Authentication Overview

Hex has two completely separate authentication systems:

| System | Handles | Implemented in |
|---|---|---|
| Client → Node auth | User login, sessions, OAuth, RBAC | `node` |
| Node → Core auth | Panel trust, machine identity, API keys | `node` + `core` |

These systems are fully independent. `core` has no knowledge of users, sessions, or OAuth.

---

# Part 1 — Client Authentication (Client → Node)

This covers browsers (`site`), mobile apps, and bots connecting to `node`.

---

## 1a. Browser Login Flow

```
1. User submits username + password to POST /api/v1/auth/login
2. node validates password (Argon2id hash comparison)
3. node generates access_token (JWT, 15 min) + refresh_token (opaque, 30 days)
4. node sets both as HttpOnly Secure cookies
5. Browser stores nothing — cookies are automatic
6. All subsequent requests carry the access_token cookie automatically
7. WebSocket connections authenticate using the active access_token at handshake
```

### Password Requirements

- Minimum 12 characters
- Stored using Argon2id (never bcrypt, never MD5, never plaintext)
- Never logged, never returned by any API

### Token Cookies

```
access_token cookie:
  Name:     hex_access
  HttpOnly: true
  Secure:   true
  SameSite: Lax
  Path:     /
  MaxAge:   15 minutes

refresh_token cookie:
  Name:     hex_refresh
  HttpOnly: true
  Secure:   true
  SameSite: Lax
  Path:     /api/v1/auth/refresh
  MaxAge:   30 days
```

Each session under the same account gets its own access token. All sessions are tracked in `node`'s SQLite database. Multiple browser tabs or devices each have their own active token.

### Token Flow

```
POST /api/v1/auth/login
  → sets access_token cookie (15 min) + refresh_token cookie (30 days)

POST /api/v1/auth/refresh   ← called silently by node when access_token expires
  → sets new access_token cookie

POST /api/v1/auth/logout
  → invalidates refresh_token, clears both cookies
```

### Session Invalidation

Tokens are invalidated on:
- Explicit logout (`POST /api/v1/auth/logout`)
- Password change
- Admin revocation
- Refresh token expiry (30 days of inactivity)

---

## 1b. OAuth Login Flow

Supported providers: Google, GitHub, Discord, Microsoft (future).

```
1. User clicks "Login with GitHub"
2. node redirects browser to GitHub OAuth URL
3. User authorizes on GitHub
4. GitHub redirects to node callback: GET /api/v1/auth/oauth/github/callback
5. node exchanges code for GitHub access token (server-side only)
6. node fetches user info from GitHub
7. node creates or links local user account
8. node generates hex access_token (15 min) + refresh_token (30 days)
9. node sets both as HttpOnly cookies
10. Browser is redirected to dashboard
```

OAuth access tokens from providers are never sent to the browser. They are used server-side by `node` only and never stored after the initial exchange.

---

## 1c. Mobile App / Bot Login Flow

Mobile apps and bots use the same API as the browser but receive tokens in the response body instead of cookies (since cookies are browser-specific).

```
1. Client sends POST /api/v1/auth/login with username + password
2. node validates credentials
3. node returns:
   {
     "access_token": "eyJ...",      ← JWT, 15 minutes
     "refresh_token": "hex_rt_...", ← Opaque token, 30 days
     "expires_in": 900
   }
4. Client stores refresh_token in secure device storage
5. Client sends access_token in Authorization header on every request:
   Authorization: Bearer <access_token>
6. For WebSocket: client passes access_token as query param on connect:
   wss://panel.example.com/ws?token=<access_token>
7. When access_token expires, client calls POST /api/v1/auth/refresh
8. node returns new access_token (and rotates refresh_token)
```

### Access Token (JWT)

```json
{
  "sub": "user_id",
  "role": "admin",
  "permissions": ["docker.manage", "terminal.access"],
  "iat": 1700000000,
  "exp": 1700000900
}
```

- Signed with `node`'s secret key (HS256 or RS256)
- Valid for 15 minutes
- Each session / device gets its own access token

### Refresh Token

- Opaque random string (not a JWT)
- Stored in `node`'s SQLite database linked to the user and session
- Valid for 30 days
- Single-use: each refresh rotates the refresh token (old one is invalidated)
- Mobile apps store in Keychain (iOS) or Keystore (Android)
- Never stored in plain text on the device

---

## 1d. RBAC Enforcement

After authentication, every request is checked against the user's role and permissions before being forwarded to `core`.

```
Request received by node
  ↓
Session / JWT validated
  ↓
User loaded from database
  ↓
Permission checked for this endpoint
  ↓
Allowed → forward to core
Denied  → 403 Forbidden (never forwarded)
```

`core` never sees unauthorized requests. RBAC is enforced entirely by `node`.

---

## 1e. 2FA (Future)

Planned support:
- TOTP (Google Authenticator, Authy)
- WebAuthn / Passkeys
- FIDO2 / Hardware Security Keys

When enabled, 2FA is required after password validation before a session is created.

---

# Part 2 — Node → Core Authentication

This covers how `node` authenticates itself to `core`. `core` has no user concept — it only authenticates trusted `node` instances.

---

## 2a. Initial Trust Flow

Before `node` can communicate with `core`, it must be explicitly registered and approved. This happens once per `node` instance.

### Step 1 — Generate Temporary Registration Token

The administrator runs on the `core` VPS:

```bash
sudo hex core create-api "Production Panel"
```

`core` generates a secure 64-character registration token.

```
hx_reg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**This token expires in 10 minutes.** It is used only once for registration.

---

### Step 2 — Panel Registration Attempt

`node` sends a registration request to `core`:

```http
POST /auth/register
Authorization: Bearer hx_reg_<registration-token>
Content-Type: application/json

{
  "panel_name": "Production Panel",
  "panel_domain": "panel.example.com",
  "cert_fingerprint": "SHA256:..."
}
```

`core` immediately rejects the connection:

```http
HTTP/1.1 403 Forbidden
{"error": "Endpoint not approved"}
```

But `core` logs the connection internally as **Pending**:

```
[PENDING] Panel Registration Request
Name:        Production Panel
IP:          203.0.113.42:51234
Domain:      panel.example.com
Fingerprint: SHA256:abc123...
Time:        2024-01-01 12:00:00 UTC
Location:    Frankfurt, Germany (best effort)
```

---

### Step 3 — Administrator Approval

The administrator reviews the pending request in the `core` CLI logs and approves or denies:

```bash
# Approve
hex core approve 203.0.113.42

# Deny
hex core deny 203.0.113.42
```

On approval, `core`:
1. Generates a permanent Panel API Key:
   ```
   hx_panel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
2. Permanently binds the API Key to the approved IP address
3. Stores the panel certificate fingerprint
4. Returns the API Key to `node`

The Panel API Key is displayed **once**. If lost, the administrator must revoke and regenerate it.

One `core` may trust multiple `node` instances. Each has its own API Key. Revoking one does not affect others.

---

### Step 4 — JWT Exchange

After approval, `node` exchanges its Panel API Key for a short-lived JWT:

```http
POST /auth/refresh
Authorization: Bearer hx_panel_<api-key>
```

`core` validates:
1. API Key is valid and not revoked
2. Request IP matches the bound IP for this API Key
3. mTLS certificate is valid (remote connections only)

On success:

```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

JWT is valid for **15 minutes**.

---

### Step 5 — Standard Requests

Every request from `node` to `core` carries the JWT:

```http
GET /docker/containers
Authorization: Bearer eyJhbG...
```

When the JWT expires, `node` silently calls `POST /auth/refresh` to get a new one. This happens automatically with no user interaction.

---

## 2b. IP Binding Security

`core` validates the source IP on every request against the IP bound to the API Key.

```
Request arrives at core
  ↓
mTLS certificate validated (remote only)
  ↓
JWT validated (signature + expiry)
  ↓
Source IP compared to bound IP for this API Key
  ↓
Match → process request
No match → 403 Forbidden (even with valid JWT)
```

This means a stolen JWT or API Key cannot be used from a different IP address.

---

## 2c. Same-Machine Authentication

When `node` and `core` run on the same machine, they communicate via **Unix socket only**.

```
node → /var/run/hex/core.sock → core
```

- No JWT required — filesystem permissions are the security boundary
- No TLS required — Unix socket is local IPC, not a network connection
- No IP whitelist — not applicable to a socket file
- Socket owned by `hex` system user, permissions `0600`
- Both `core` and `node` run as `hex` — no other process can access the socket
- `core` opens no network port in this mode
- During installation, `node` is automatically trusted — no `hex core approve` step needed
- Localhost HTTP is explicitly forbidden — any process on the machine can connect to a localhost port

---

## 2d. Remote Authentication Modes

### Mode A — Secure (Recommended)

Used when `node` and `core` are on different machines and a domain/TLS is available.

```
node → HTTPS + mTLS + JWT + IP Whitelist → core
```

mTLS flow:
```
node presents panel.crt (client certificate)
core presents core.crt (server certificate)
Both certificates signed by internal Hex CA (/var/lib/hex/certs/ca.crt)
TLS handshake fails if either certificate is invalid
JWT check occurs after TLS handshake succeeds
IP whitelist check occurs after JWT validation
```

mTLS is enforced at the TLS layer — invalid certificates fail before any application code runs.

For WebSocket (terminal, metrics, logs): mTLS + JWT are validated only at initial connection and reconnection. Not on every message.

Certificate storage:
```
/var/lib/hex/certs/ca.crt      ← Hex internal CA (on both core and node)
/var/lib/hex/certs/core.crt    ← core server cert
/var/lib/hex/certs/core.key    ← core server key
/var/lib/hex/certs/panel.crt   ← node client cert
/var/lib/hex/certs/panel.key   ← node client key
```

---

### Mode B — Non-Secure (Private network / no domain)

Used when `node` and `core` are on different machines but no domain or TLS is available (e.g. private LAN, dev environment).

```
node → HTTP + JWT + IP Whitelist → core
```

- No mTLS, no TLS
- JWT still required on every request
- IP whitelist still enforced
- Never use over the public internet
- Acceptable only on a trusted private network

---

## 2d. API Key Management

```bash
# Create a new panel API Key
sudo hex core create-api "Panel Name"

# List all trusted panels
sudo hex core list-panels

# Revoke a panel API Key
sudo hex core revoke <panel-id>

# Approve a pending panel
sudo hex core approve <panel-ip>

# Deny a pending panel
sudo hex core deny <panel-ip>
```

Revoking an API Key immediately prevents `node` from obtaining new JWTs. Existing JWTs remain valid until they expire (max 15 minutes).

---

# Authentication Summary

| Flow | Method | Issued by | Validated by |
|---|---|---|---|
| Browser login | access_token + refresh_token in HttpOnly cookies | node | node |
| Mobile/bot login | access_token (15 min) + refresh_token (30 days) in response body | node | node |
| OAuth login | access_token + refresh_token in HttpOnly cookies (after OAuth) | node | node |
| Browser WebSocket | access_token cookie validated at handshake | node | node |
| Mobile WebSocket | access_token as query param validated at handshake | node | node |
| node → core (same machine) | None — Unix socket + filesystem permissions | N/A | OS |
| node → core (remote, secure) | mTLS cert + JWT (from API Key) + IP whitelist | Hex CA + node | core |
| node → core (remote, non-secure) | JWT (from API Key) + IP whitelist | node | core |

---

# Security Rules

1. Passwords are always hashed with Argon2id. Never bcrypt, never MD5, never plaintext.
2. Browser tokens (access + refresh) are stored in HttpOnly cookies. Never accessible to JavaScript.
3. Mobile app refresh tokens are stored in secure OS storage. Never in plain text.
4. Panel API Keys never leave `node`. The browser never sees them.
5. Same-machine communication uses Unix socket only. No JWT, no TLS, no localhost HTTP.
6. Remote communication always requires JWT + IP whitelist at minimum.
7. Remote secure mode additionally requires mTLS on every connection.
8. WebSocket connections (remote) authenticate with mTLS + JWT only at initial connect and reconnect — not on every message.
9. Registration tokens expire in 10 minutes and are single-use.
10. Panel API Keys are permanent until explicitly revoked by an administrator.
11. JWT rotation happens automatically and silently — no user interaction required.
12. `core` never stores or validates user credentials. It only validates trusted `node` instances.
13. If the VPS is compromised, all security is void — additional auth layers on Unix socket are pointless theater.
