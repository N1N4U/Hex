# Hex Core API Reference

The Hex Core API uses standard HTTP REST principles.
- **Base URL:** `https://<core-ip>:8080` (or `http` for local dev)
- **Headers:** All requests MUST include `Authorization: Bearer <token>`
- **Content-Type:** `application/json` for all POST requests.

---

## 1. Auth / Connection

### `POST /auth/register`
Called by the Panel using the temporary API Key to initiate the connection.
**Request:**
```json
{
  "panel_name": "My Prod Panel"
}
```
**Response (202 Accepted):**
```json
{
  "status": "pending",
  "message": "Awaiting Core Approval via CLI"
}
```
**Response (403 Forbidden):**
```json
{
  "error": "Forbidden: Endpoint Not Approved. Run 'hex core approve <ip:port>' on the Core."
}
```

### `POST /auth/refresh`
Exchanges the permanent API Key for a short-lived 15-minute JWT.
**Response (200 OK):**
```json
{
  "jwt": "eyJhbG...",
  "expires_in": 900
}
```

---

## 2. Docker Engine

### `GET /docker/containers`
Returns an array of all active containers.
**Response (200 OK):**
```json
[
  {
    "id": "abc123def",
    "name": "nginx-web",
    "image": "nginx:latest",
    "state": "running",
    "ports": [{"PublicPort": 80, "PrivatePort": 80, "Type": "tcp"}],
    "created_at": 1678901234
  }
]
```

### `POST /docker/create`
Spins up a new Docker container.
**Request:**
```json
{
  "name": "my-database",
  "image": "postgres:15",
  "env": ["POSTGRES_PASSWORD=secret"],
  "ports": {"5432": "5432"},
  "command": []
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "container_id": "xyz987"
}
```

### `POST /docker/action?id=<id>&action=<action>`
Valid actions: `start`, `stop`, `restart`, `kill`, `delete`.
**Response (200 OK):**
```json
{
  "success": true
}
```

---

## 3. System Monitor

### `GET /monitor`
Returns live host statistics including per-core usage, usernames, all top processes, swap usage, and multiple partition data.
**Response (200 OK):**
```json
{
  "cpu_usage": 12.5,
  "cpu_cores_usage": [10.2, 14.8],
  "load_1": 0.15,
  "load_5": 0.20,
  "load_15": 0.18,
  "task_count": 29,
  "swap_total": 2147483648,
  "swap_used": 512000,
  "mem_total": 8589934592,
  "mem_used": 4294967296,
  "mem_usage": 50.0,
  "disk_total": 500107862016,
  "disk_used": 100021572403,
  "disk_usage": 20.0,
  "partitions": [
    {
      "device": "/dev/sda1",
      "mountpoint": "/",
      "total": 500107862016,
      "used": 100021572403,
      "used_percent": 20.0
    }
  ],
  "net_sent": 1024,
  "net_recv": 2048,
  "net_total_sent": 1024000,
  "net_total_recv": 2048000,
  "timestamp": "2026-08-19T13:00:00Z",
  "uptime": 3600,
  "os_name": "ubuntu 22.04",
  "cpu_model": "Intel(R) Xeon(R) CPU",
  "cpu_cores": 2,
  "host_ip": "203.0.113.1",
  "top_processes": [
    {
      "pid": 1,
      "name": "systemd",
      "user": "root",
      "time_plus": "0:01.23",
      "cpu_percent": 0.1,
      "memory_bytes": 10240000
    }
  ]
}
```

---

## 4. Nginx Reverse Proxy

### `POST /proxy`
Generates a new `.conf` file inside `/etc/nginx/conf.d/` and dynamically reloads Nginx. If the syntax is invalid, the Core automatically rolls back to prevent crashing Nginx.
**Request:**
```json
{
  "name": "webapp",
  "domain": "example.com",
  "targetIp": "127.0.0.1",
  "targetPort": 3000,
  "enableSsl": true
}
```
**Response (200 OK):**
```json
{
  "success": true
}
```
**Response (500 Internal Server Error - Syntax Failure):**
```json
{
  "error": "Nginx configuration test failed: ... (rollback successful)"
}
```

### `DELETE /proxy?name=<name>`
Removes the domain config and reloads Nginx.

---

## 5. File Manager

### `GET /files?path=<path>`
Lists the directory contents within the `/var/lib/hex` sandbox.
**Response (200 OK):**
```json
[
  {
    "name": "config.json",
    "is_dir": false,
    "size": 1024,
    "mod_time": "2026-07-19T10:00:00Z"
  }
]
```

### `GET /files?path=<path>&action=read`
Downloads raw binary/text file contents.
**Response Header:** `Content-Type: application/octet-stream`

### `POST /files?path=<path>`
Uploads a file.
**Body:** Raw bytes.
**Response (200 OK):** `{"success": true}`

### `DELETE /files?path=<path>`
**Response (200 OK):** `{"success": true}`

## Firewall

- `GET /api/nodes/[id]/firewall` - Fetches firewall rules from Core.
- `POST /api/nodes/[id]/firewall?action=[allow|deny|enable|disable]&port=[port]` - Updates firewall rules on Core.
