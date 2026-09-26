# Advanced Logs API

The Hex Core exposes an API for direct system log aggregation.

## System Logs

- `GET /system/logs?type=journal` - Returns the last 200 lines of `journalctl`.
- `GET /system/logs?type=auth` - Returns the last 200 lines of `/var/log/auth.log` (Login attempts).
- `GET /system/logs?type=syslog` - Returns the last 200 lines of `/var/log/syslog` (System events).
