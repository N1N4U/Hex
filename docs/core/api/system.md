# Advanced System & Storage API

The Hex Core exposes an extensive REST API for Host Linux System Management.

## Package Manager (APT)

- `GET /system/packages` - List all installed packages via `dpkg -l`.
- `POST /system/packages?action=install&pkg=<name>` - Runs `apt-get install -y <name>`.
- `POST /system/packages?action=remove&pkg=<name>` - Runs `apt-get remove -y <name>`.
- `POST /system/packages?action=update` - Runs `apt-get update`.
- `POST /system/packages?action=upgrade` - Runs `apt-get upgrade -y`.

## Storage Management

- `GET /system/storage` - Returns a JSON array of all mounted disk partitions via `lsblk -J`.

## System Services (Systemctl)

- `GET /system/services?service=<name>` - Returns `systemctl status <name>` text output.
- `POST /system/services?action=<action>&service=<name>` - Runs `systemctl <action> <name>`. 
  - Valid actions: `start`, `stop`, `restart`, `enable`, `disable`.

## Host Power

- `POST /system/power?action=reboot` - Securely reboots the host OS via `sudo reboot`.
- `POST /system/power?action=shutdown` - Securely shuts down the host OS via `sudo shutdown -h now`.
