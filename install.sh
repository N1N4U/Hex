#!/bin/bash
set -e

# ==============================================================================
#  HEX - AUTOMATED PRODUCTION INSTALLER v2.0
#  Graphite Noir × Glacier Silver Edition
#  Supported OS: Ubuntu, Debian, Fedora, Rocky Linux, AlmaLinux
# ==============================================================================

LOG_FILE="/var/log/hex-install.log"
mkdir -p /var/log
exec > >(tee -a "$LOG_FILE") 2>&1
exec 3>&1

# ANSI Color Palette
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_DIM='\033[2m'
C_SILVER='\033[38;5;254m'
C_GRAPHITE='\033[38;5;240m'
C_CYAN='\033[38;5;51m'
C_BLUE='\033[38;5;39m'
C_GREEN='\033[38;5;48m'
C_AMBER='\033[38;5;220m'
C_RED='\033[38;5;203m'

print_banner() {
  echo -e "${C_CYAN}" >&3
  cat << "EOF" >&3
  ██╗  ██╗███████╗██╗  ██╗
  ██║  ██║██╔════╝╚██╗██╔╝
  ███████║█████╗   ╚███╔╝ 
  ██╔══██║██╔══╝   ██╔██╗ 
  ██║  ██║███████╗██╔╝ ██╗
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
EOF
  echo -e "  ${C_SILVER}${C_BOLD}HEX${C_RESET} ${C_GRAPHITE}·${C_RESET} ${C_DIM}Automated Production Installer v2.0${C_RESET}" >&3
  echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}" >&3
}

# Sleek Modern Download Helper
download_asset() {
  local url="$1"
  local dest="$2"
  local label="$3"

  rm -f "$dest"

  local total_bytes
  total_bytes=$(curl -sIL "$url" 2>/dev/null | tr -d '\r' | grep -i '^content-length:' | tail -n 1 | awk '{print $2}')

  if ! [[ "$total_bytes" =~ ^[0-9]+$ ]] || [ "$total_bytes" -le 0 ]; then
    printf "        ${C_CYAN}⟳${C_RESET} ${C_SILVER}Fetching %s...${C_RESET} " "$label" >&3
    if curl -sSL -f -o "$dest" "$url"; then
      local sz
      sz=$(du -h "$dest" 2>/dev/null | awk '{print $1}' || echo "done")
      echo -e "${C_GREEN}✓${C_RESET} ${C_DIM}($sz)${C_RESET}" >&3
      return 0
    else
      echo -e "${C_RED}✗ Failed${C_RESET}" >&3
      return 1
    fi
  fi

  curl -sSL -f -o "$dest" "$url" 2>/dev/null &
  local curl_pid=$!

  local bar_width=24
  local total_mb
  total_mb=$(awk -v t="$total_bytes" 'BEGIN { printf "%.1f MB", t/(1024*1024) }')

  while kill -0 "$curl_pid" 2>/dev/null; do
    if [ -f "$dest" ]; then
      local cur_bytes
      cur_bytes=$(stat -c%s "$dest" 2>/dev/null || wc -c < "$dest" 2>/dev/null || echo 0)
      if [ "$cur_bytes" -gt "$total_bytes" ]; then cur_bytes=$total_bytes; fi

      local pct=$(( cur_bytes * 100 / total_bytes ))
      local filled=$(( pct * bar_width / 100 ))
      local empty=$(( bar_width - filled ))

      local bar=""
      for ((i=0; i<filled; i++)); do bar="${bar}█"; done
      for ((i=0; i<empty; i++)); do bar="${bar}░"; done

      local cur_mb
      cur_mb=$(awk -v c="$cur_bytes" 'BEGIN { printf "%.1f", c/(1024*1024) }')

      printf "\r        ${C_CYAN}[%s]${C_RESET} ${C_BOLD}%3d%%${C_RESET} ${C_DIM}(%s / %s)${C_RESET}" "$bar" "$pct" "$cur_mb" "$total_mb" >&3
    fi
    sleep 0.12
  done

  if wait "$curl_pid"; then
    local full_bar=""
    for ((i=0; i<bar_width; i++)); do full_bar="${full_bar}█"; done
    printf "\r        ${C_GREEN}[%s] 100%%${C_RESET} ${C_DIM}(%s)${C_RESET} ${C_GREEN}✓ Complete${C_RESET}\n" "$full_bar" "$total_mb" >&3
    return 0
  else
    printf "\r        ${C_RED}[✗] Download interrupted or failed for %s.${C_RESET}\n" "$label" >&3
    rm -f "$dest"
    return 1
  fi
}

clear 2>/dev/null || true
print_banner

# Root check
if [ "$EUID" -ne 0 ]; then
  echo -e "  ${C_RED}[✗] Privilege Error:${C_RESET} Please run this installer as root: ${C_CYAN}sudo bash install.sh${C_RESET}" >&3
  exit 1
fi

# 1. OS & Architecture Detection
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  OS_NAME=$PRETTY_NAME
else
  echo -e "  ${C_RED}[✗] Unsupported OS:${C_RESET} Cannot detect Linux distribution." >&3
  exit 1
fi

ARCH=$(uname -m)
if [ "$ARCH" == "x86_64" ]; then
  HEX_ARCH="amd64"
elif [ "$ARCH" == "aarch64" ]; then
  HEX_ARCH="arm64"
else
  echo -e "  ${C_RED}[✗] Unsupported Architecture:${C_RESET} $ARCH (Hex requires amd64 or arm64)" >&3
  exit 1
fi

echo -e "  ${C_GREEN}[✓] System Preflight:${C_RESET} $OS_NAME ${C_GRAPHITE}·${C_RESET} Architecture: ${C_CYAN}$HEX_ARCH${C_RESET}" >&3
echo "" >&3

# 2. Interactive Deployment Selection
echo -e "  ${C_BOLD}${C_SILVER}SELECT DEPLOYMENT TOPOLOGY:${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}┌─────────────────────────────────────────────────────────────┐${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_CYAN}[1] Core Only${C_RESET}       ${C_DIM}Lightweight Worker / Node Agent Daemon${C_RESET}     ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_CYAN}[2] Panel Only${C_RESET}      ${C_DIM}BFF Web Management UI (Connects to Cores)${C_RESET}  ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_CYAN}[3] Core + Panel${C_RESET}    ${C_GREEN}${C_BOLD}Standard Unified Host Installation${C_RESET}         ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_CYAN}[4] Core + Panel${C_RESET}    ${C_AMBER}High Security (Core Port Locked Locally)${C_RESET}   ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}└─────────────────────────────────────────────────────────────┘${C_RESET}" >&3
echo "" >&3

read -p "  Enter choice [1-4] (Default: 3): " INSTALL_MODE </dev/tty
INSTALL_MODE=${INSTALL_MODE:-3}

# Port Configuration
CORE_PORT=8080
PANEL_PORT=3000
MASTER_USER="admin"
MASTER_TEMP_PASS=""

if [ "$INSTALL_MODE" -eq 1 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then
  read -p "  Hex Core Port [8080]: " INPUT_CORE_PORT </dev/tty
  CORE_PORT=${INPUT_CORE_PORT:-8080}
fi

if [ "$INSTALL_MODE" -eq 2 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then
  read -p "  Hex Panel Port [3000]: " INPUT_PANEL_PORT </dev/tty
  PANEL_PORT=${INPUT_PANEL_PORT:-3000}

  echo "" >&3
  echo -e "  ${C_BOLD}${C_AMBER}👑 MASTER ADMINISTRATOR AUTHENTICATION SETUP${C_RESET}" >&3
  echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}" >&3
  echo -e "  ${C_DIM}The Master account holds unrestricted Owner RBAC authority.${C_RESET}" >&3
  echo -e "  ${C_DIM}For maximum security, Hex does not assign permanent passwords.${C_RESET}" >&3
  echo -e "  ${C_DIM}A 12-char rotating emergency key valid for 1 hour will be generated.${C_RESET}" >&3
  echo -e "  ${C_DIM}You can generate a fresh key anytime by running '${C_CYAN}hex master${C_RESET}${C_DIM}' on this VPS.${C_RESET}" >&3
  echo "" >&3
  read -p "  Master Username [admin]: " INPUT_MASTER_USER </dev/tty
  MASTER_USER=${INPUT_MASTER_USER:-admin}

  # Generate 12-character high entropy password (no quotes/backslashes)
  MASTER_TEMP_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+=' < /dev/urandom | head -c 12)
fi

read -p "  Automate Firewall rules? (Y/n): " CONF_FW </dev/tty
CONF_FW=${CONF_FW:-Y}

# Map mode
case $INSTALL_MODE in
  1) MODE_NAME="Core Only (Worker Node)" ;;
  2) MODE_NAME="Panel Only (Management UI)" ;;
  3) MODE_NAME="Unified Core + Panel" ;;
  4) MODE_NAME="Unified Core + Panel (Secure Mode)" ;;
  *) MODE_NAME="Unified Core + Panel"; INSTALL_MODE=3 ;;
esac

echo "" >&3
echo -e "  ${C_GRAPHITE}┌── Installation Plan ────────────────────────────────────────┐${C_RESET}" >&3
printf "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Topology:${C_RESET}    %-47s ${C_GRAPHITE}│${C_RESET}\n" "$MODE_NAME" >&3
if [ "$INSTALL_MODE" -ne 2 ]; then
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Core Port:${C_RESET}   %-47s ${C_GRAPHITE}│${C_RESET}\n" "$CORE_PORT" >&3
fi
if [ "$INSTALL_MODE" -ne 1 ]; then
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Panel Port:${C_RESET}  %-47s ${C_GRAPHITE}│${C_RESET}\n" "$PANEL_PORT" >&3
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Master User:${C_RESET} %-47s ${C_GRAPHITE}│${C_RESET}\n" "$MASTER_USER (One-Time Key)" >&3
fi
echo -e "  ${C_GRAPHITE}└─────────────────────────────────────────────────────────────┘${C_RESET}" >&3
echo "" >&3

read -p "  Press ENTER to begin automated deployment or Ctrl+C to cancel..." </dev/tty

# 3. Port Conflict Preflight Check
check_port() {
  if command -v ss &>/dev/null; then
    if ss -tuln | grep -q ":$1 "; then
      echo -e "  ${C_RED}[✗] Port Conflict:${C_RESET} Port $1 is already in use by another service." >&3
      exit 1
    fi
  fi
}
if [ "$INSTALL_MODE" -ne 2 ]; then check_port "$CORE_PORT"; fi
if [ "$INSTALL_MODE" -ne 1 ]; then check_port "$PANEL_PORT"; fi

# 4. Dependency & Docker Engine Installation
echo "" >&3
echo -e "  ${C_CYAN}[1/5]${C_RESET} ${C_BOLD}${C_SILVER}Installing System Dependencies & Docker Engine...${C_RESET}" >&3
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y -qq
  apt-get install -y -qq ca-certificates curl gnupg ufw openssl tar wget jq iproute2 nginx

  if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes 2>/dev/null
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS "$VERSION_CODENAME" stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
elif [[ "$OS" == "fedora" || "$OS" == "rocky" || "$OS" == "almalinux" || "$OS" == "centos" ]]; then
  dnf install -y -q curl wget tar jq openssl firewalld iproute nginx
  if ! command -v docker &>/dev/null; then
    dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo 2>/dev/null || true
    dnf install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
fi

systemctl enable docker 2>/dev/null || true
systemctl start docker 2>/dev/null || true
echo -e "        ${C_GREEN}✓${C_RESET} Docker Engine & dependencies operational." >&3

# 5. Deploy Hex Core Daemon
if [ "$INSTALL_MODE" -eq 1 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then
  echo -e "  ${C_CYAN}[2/5]${C_RESET} ${C_BOLD}${C_SILVER}Deploying Hex Core Daemon ($HEX_ARCH)...${C_RESET}" >&3
  mkdir -p /var/lib/hex/core/data
  mkdir -p /etc/hex/core/certs
  mkdir -p /var/log/hex

  CORE_DOWNLOAD_URL="https://github.com/N1N4U/Hex/releases/latest/download/hex-core-linux-$HEX_ARCH"
  if ! download_asset "$CORE_DOWNLOAD_URL" "/var/lib/hex/core/hex-core" "Hex Core Daemon"; then
    echo -e "  ${C_RED}[✗] Failed to download Hex Core binary from $CORE_DOWNLOAD_URL${C_RESET}" >&3
    exit 1
  fi
  chmod +x /var/lib/hex/core/hex-core

  # Generate Mutual TLS (mTLS) Certificates
  cd /etc/hex/core/certs
  if [ ! -f "ca.key" ]; then
    openssl genrsa -out ca.key 4096 2>/dev/null
    openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/CN=Hex-Root-CA" 2>/dev/null
    openssl genrsa -out server.key 2048 2>/dev/null
    openssl req -new -key server.key -out server.csr -subj "/CN=hex-core" 2>/dev/null
    openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 3650 -sha256 2>/dev/null
    openssl genrsa -out client.key 2048 2>/dev/null
    openssl req -new -key client.key -out client.csr -subj "/CN=hex-panel" 2>/dev/null
    openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 3650 -sha256 2>/dev/null
    chmod 600 *.key
  fi

  # Systemd service
  cat << EOF > /etc/systemd/system/hex-core.service
[Unit]
Description=Hex Core Daemon
After=network.target docker.service

[Service]
ExecStart=/var/lib/hex/core/hex-core --port $CORE_PORT
Restart=always
User=root
WorkingDirectory=/var/lib/hex/core
StandardOutput=append:/var/log/hex/core.log
StandardError=append:/var/log/hex/core-error.log

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable hex-core 2>/dev/null || true
  systemctl restart hex-core 2>/dev/null || true
  echo -e "        ${C_GREEN}✓${C_RESET} Hex Core daemon active on port $CORE_PORT." >&3
fi

# 6. Deploy Hex Panel & Setup Master Credentials
if [ "$INSTALL_MODE" -eq 2 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then
  echo -e "  ${C_CYAN}[3/5]${C_RESET} ${C_BOLD}${C_SILVER}Deploying Hex Panel (SvelteKit + Go BFF)...${C_RESET}" >&3
  mkdir -p /opt/hex/panel/data

  PANEL_DOWNLOAD_URL="https://github.com/N1N4U/Hex/releases/latest/download/hex-panel-linux-$HEX_ARCH"
  if ! download_asset "$PANEL_DOWNLOAD_URL" "/opt/hex/panel/hex-panel" "Hex Panel Interface"; then
    echo -e "  ${C_RED}[✗] Failed to download Hex Panel binary.${C_RESET}" >&3
    exit 1
  fi
  chmod +x /opt/hex/panel/hex-panel

  # Generate /opt/hex/panel/settings.json
  cat << EOF > /opt/hex/panel/settings.json
{
    "port": $PANEL_PORT,
    "basic": {
        "panel_name": "Hex Panel",
        "label_made_by": "N1N4U",
        "discord": "https://discord.com/users/1093946948928680008",
        "github": "https://github.com/N1N4U/Hex",
        "feedback": "https://github.com/N1N4U/Hex"
    },
    "master_auth": {
        "username": "$MASTER_USER",
        "password": "$MASTER_TEMP_PASS"
    },
    "auth": {
        "discord": { "toggle": false, "client_id": "", "client_secret": "", "redirect_link": "" },
        "google": { "toggle": false, "client_id": "", "client_secret": "", "redirect_link": "" },
        "gmail_smtp": { "toggle": false, "host": "", "port": 587, "email": "", "password": "" }
    },
    "logger": {
        "timestamp": false,
        "debug": { "toggle": true, "core": true }
    },
    "database": {
        "type": "sqlite",
        "core": {
            "type": "sqlite",
            "sqlite": { "path": "/var/lib/hex/core/data/hex-core.db" },
            "mogodb": { "datatbase": "hex-core", "uri": "mongodb://localhost:27017/hex-core" },
            "mysql": { "host": "localhost", "port": 3306, "user": "root", "password": "", "database": "hex-core" }
        },
        "node": {
            "type": "sqlite",
            "sqlite": { "path": "/opt/hex/panel/data/hex-node.db" },
            "mogodb": { "datatbase": "hex-node", "uri": "mongodb://localhost:27017/hex-node" },
            "mysql": { "host": "localhost", "port": 3306, "user": "root", "password": "", "database": "hex-node" }
        }
    }
}
EOF
  chmod 600 /opt/hex/panel/settings.json

  cat << EOF > /etc/systemd/system/hex-panel.service
[Unit]
Description=Hex Panel (Node BFF + UI)
After=network.target hex-core.service

[Service]
ExecStart=/opt/hex/panel/hex-panel
Restart=always
User=root
WorkingDirectory=/opt/hex/panel
Environment="HEX_NODE_PORT=$PANEL_PORT"
Environment="HEX_CORE_URL=http://127.0.0.1:$CORE_PORT"
Environment="HEX_CORE_SOCKET=/var/run/hex/core.sock"

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable hex-panel 2>/dev/null || true
  systemctl restart hex-panel 2>/dev/null || true
  echo -e "        ${C_GREEN}✓${C_RESET} Hex Panel service active on port $PANEL_PORT." >&3
fi

# 7. Install Hex CLI & Presets
echo -e "  ${C_CYAN}[4/5]${C_RESET} ${C_BOLD}${C_SILVER}Configuring Global CLI & Presets Catalog...${C_RESET}" >&3
CLI_URL="https://raw.githubusercontent.com/N1N4U/Hex/main/hex.sh"
curl -sSL -f -o /usr/local/bin/hex "$CLI_URL" 2>/dev/null || true
chmod +x /usr/local/bin/hex 2>/dev/null || true

# Presets archive
rm -rf /tmp/hex-repo
mkdir -p /tmp/hex-repo /var/lib/hex/presets
if curl -sSL -f -o /tmp/hex-repo/main.tar.gz "https://github.com/N1N4U/Hex/archive/refs/heads/main.tar.gz" 2>/dev/null; then
  tar -xzf /tmp/hex-repo/main.tar.gz -C /tmp/hex-repo 2>/dev/null || true
  EXTRACTED_DIR=$(find /tmp/hex-repo -maxdepth 1 -type d -name "Hex-*" | head -n 1)
  if [ -d "$EXTRACTED_DIR/presets" ]; then
    cp -r "$EXTRACTED_DIR/presets/"* /var/lib/hex/presets/ 2>/dev/null || true
  fi
  rm -rf /tmp/hex-repo
fi
echo -e "        ${C_GREEN}✓${C_RESET} Global 'hex' CLI installed to /usr/local/bin/hex." >&3
echo -e "        ${C_GREEN}✓${C_RESET} Application presets catalog synchronized." >&3

# 8. Firewall Configuration
echo -e "  ${C_CYAN}[5/5]${C_RESET} ${C_BOLD}${C_SILVER}Configuring Firewall Security Policies...${C_RESET}" >&3
if [[ "$CONF_FW" == "y" || "$CONF_FW" == "Y" ]]; then
  if command -v ufw &>/dev/null; then
    ufw allow ssh >/dev/null 2>&1 || true
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    if [ "$INSTALL_MODE" -eq 1 ] || [ "$INSTALL_MODE" -eq 3 ]; then ufw allow "$CORE_PORT/tcp" >/dev/null 2>&1 || true; fi
    if [ "$INSTALL_MODE" -ne 1 ]; then ufw allow "$PANEL_PORT/tcp" >/dev/null 2>&1 || true; fi
    ufw --force enable >/dev/null 2>&1 || true
    echo -e "        ${C_GREEN}✓${C_RESET} UFW rules successfully applied." >&3
  elif command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld 2>/dev/null; then
    firewall-cmd --permanent --add-service=ssh >/dev/null 2>&1 || true
    firewall-cmd --permanent --add-port=80/tcp >/dev/null 2>&1 || true
    firewall-cmd --permanent --add-port=443/tcp >/dev/null 2>&1 || true
    if [ "$INSTALL_MODE" -eq 1 ] || [ "$INSTALL_MODE" -eq 3 ]; then firewall-cmd --permanent --add-port="$CORE_PORT/tcp" >/dev/null 2>&1 || true; fi
    if [ "$INSTALL_MODE" -ne 1 ]; then firewall-cmd --permanent --add-port="$PANEL_PORT/tcp" >/dev/null 2>&1 || true; fi
    firewall-cmd --reload >/dev/null 2>&1 || true
    echo -e "        ${C_GREEN}✓${C_RESET} Firewalld rules successfully applied." >&3
  fi
else
  echo -e "        ${C_DIM}Firewall automation skipped by user preference.${C_RESET}" >&3
fi

# Detect Host IP
SERVER_IP=$(curl -s4 --max-time 2 https://api.ipify.org 2>/dev/null || ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -n 1 || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo "" >&3
echo -e "  ${C_GRAPHITE}╭─────────────────────────────────────────────────────────────╮${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}                 ${C_GREEN}${C_BOLD}✓ HEX DEPLOYMENT SUCCESSFUL${C_RESET}                 ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}├─────────────────────────────────────────────────────────────┤${C_RESET}" >&3
if [ "$INSTALL_MODE" -ne 1 ]; then
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_SILVER}Panel URL:${C_RESET}      ${C_BLUE}http://%s:%s${C_RESET}%*s ${C_GRAPHITE}│${C_RESET}\n" "$SERVER_IP" "$PANEL_PORT" $((39 - ${#SERVER_IP} - ${#PANEL_PORT})) "" >&3
fi
if [ "$INSTALL_MODE" -ne 2 ]; then
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_SILVER}Core Endpoint:${C_RESET}  ${C_CYAN}http://%s:%s${C_RESET}%*s ${C_GRAPHITE}│${C_RESET}\n" "$SERVER_IP" "$CORE_PORT" $((39 - ${#SERVER_IP} - ${#CORE_PORT})) "" >&3
fi

if [ "$INSTALL_MODE" -ne 1 ]; then
  echo -e "  ${C_GRAPHITE}├─────────────────────────────────────────────────────────────┤${C_RESET}" >&3
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_AMBER}👑 MASTER ADMINISTRATOR EMERGENCY CREDENTIALS${C_RESET}               ${C_GRAPHITE}│${C_RESET}" >&3
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Username:${C_RESET}       ${C_CYAN}%-43s${C_RESET} ${C_GRAPHITE}│${C_RESET}\n" "$MASTER_USER" >&3
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Temp Password:${C_RESET}  ${C_GREEN}${C_BOLD}%-43s${C_RESET} ${C_GRAPHITE}│${C_RESET}\n" "$MASTER_TEMP_PASS" >&3
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_DIM}Expires:        In 1 Hour (Single session recovery key)${C_RESET}       ${C_GRAPHITE}│${C_RESET}" >&3
  echo -e "  ${C_GRAPHITE}├─────────────────────────────────────────────────────────────┤${C_RESET}" >&3
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_DIM}Need a new master key? Run anytime on this VPS:${C_RESET}             ${C_GRAPHITE}│${C_RESET}" >&3
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_CYAN}➜ hex master${C_RESET}                                                ${C_GRAPHITE}│${C_RESET}" >&3
fi

echo -e "  ${C_GRAPHITE}├─────────────────────────────────────────────────────────────┤${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_SILVER}Quick Commands:${C_RESET}                                             ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}    ${C_CYAN}hex status${C_RESET}   ${C_DIM}View live services, PIDs & Docker telemetry${C_RESET}     ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}    ${C_CYAN}hex update${C_RESET}   ${C_DIM}Upgrade Core, Panel, CLI & Presets${C_RESET}          ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}│${C_RESET}    ${C_CYAN}hex logs${C_RESET}     ${C_DIM}Stream real-time system journal logs${C_RESET}        ${C_GRAPHITE}│${C_RESET}" >&3
echo -e "  ${C_GRAPHITE}╰─────────────────────────────────────────────────────────────╯${C_RESET}" >&3
echo "" >&3
