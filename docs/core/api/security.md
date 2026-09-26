# Advanced Networking & Security API

The Hex Core exposes an extensive REST API for Network and Security Management.

## Firewall (UFW)

- `GET /security/firewall` - Returns the `ufw status numbered` output.
- `POST /security/firewall?action=allow&port=<port>` - Allows a port (`ufw allow <port>`).
- `POST /security/firewall?action=deny&port=<port>` - Denies a port (`ufw delete allow <port>`).
- `POST /security/firewall?action=enable` - Enables the firewall.
- `POST /security/firewall?action=disable` - Disables the firewall.

## SSH Management

- `GET /security/ssh` - Returns `systemctl status sshd` text output.
- `POST /security/ssh` - Restarts the `sshd` service to apply changes made to `/etc/ssh/sshd_config`.

## Fail2Ban

- `GET /security/fail2ban` - Returns overall Fail2ban status.
- `GET /security/fail2ban?jail=<name>` - Returns specific jail status (e.g. `sshd`).
- `POST /security/fail2ban?action=ban&jail=<name>&ip=<ip>` - Manually bans an IP in a specific jail.
- `POST /security/fail2ban?action=unban&jail=<name>&ip=<ip>` - Unbans an IP.

## Network Tools

- `GET /network/tools?action=ping&host=<host>` - Runs `ping -c 4 <host>`.
- `GET /network/tools?action=traceroute&host=<host>` - Runs `traceroute <host>`.
- `GET /network/tools?action=ports` - Returns a list of open ports (`ss -tuln`).
