#!/bin/bash
set -e

# Hex Production Installer
# Supported OS: Ubuntu, Debian, Fedora, Rocky, AlmaLinux

LOG_FILE="/var/log/hex-install.log"
exec > >(tee -a "$LOG_FILE") 2>&1

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Redirect stdout to console as well for interactive parts
exec 3>&1

# Re-attach stdin to terminal so read works when piped from curl
# Done individually per read command now.

echo -e "${CYAN}" >&3
cat << "EOF" >&3
██╗  ██╗███████╗██╗  ██╗
██║  ██║██╔════╝╚██╗██╔╝
███████║█████╗   ╚███╔╝
██╔══██║██╔══╝   ██╔██╗
██║  ██║███████╗██╔╝ ██╗
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
EOF
echo -e "${NC}" >&3
echo -e "${BLUE}==========================================================${NC}" >&3
echo -e "${GREEN}               Hex - Installation                 ${NC}" >&3
echo -e "${YELLOW}                   By N1N4U                              ${NC}" >&3
echo -e "${BLUE}==========================================================${NC}" >&3
echo "" >&3

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root (sudo)${NC}" >&3
  exit 1
fi

# 1. Detect OS & Architecture
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}[ERROR] Unsupported OS. Cannot detect OS distribution.${NC}" >&3
    exit 1
fi

ARCH=$(uname -m)
if [ "$ARCH" == "x86_64" ]; then
    HEX_ARCH="amd64"
elif [ "$ARCH" == "aarch64" ]; then
    HEX_ARCH="arm64"
else
    echo -e "${RED}[ERROR] Unsupported Architecture: $ARCH${NC}" >&3
    exit 1
fi

echo -e "${CYAN}[*] Detected OS: $OS | Architecture: $HEX_ARCH${NC}" >&3
echo "" >&3

# 2. Interactive Prompts
echo -e "Choose the installation type for this machine:" >&3
echo -e "${BLUE}==========================================================${NC}" >&3
echo -e "" >&3
echo -e "[1] Core Only (Recommended for Remote Nodes)" >&3
echo -e "[2] Panel Only" >&3
echo -e "[3] Core + Panel" >&3
echo -e "[4] Core + Panel (Secure Mode - Core port is locked)" >&3
echo -e "" >&3
echo -e "${BLUE}==========================================================${NC}" >&3
echo "" >&3
read -p "Enter your choice [1-4]: " INSTALL_MODE </dev/tty
INSTALL_MODE=${INSTALL_MODE:-1}

read -p "Core Port [8080]: " CORE_PORT </dev/tty
CORE_PORT=${CORE_PORT:-8080}

if [ "$INSTALL_MODE" -eq 2 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then
    read -p "Panel Port [3000]: " PANEL_PORT </dev/tty
    PANEL_PORT=${PANEL_PORT:-3000}
fi

read -p "Configure Firewall automatically? (Y/n): " CONF_FW </dev/tty
CONF_FW=${CONF_FW:-Y}

# Map mode to string for summary
MODE_STR="Unknown"
if [ "$INSTALL_MODE" -eq 1 ]; then MODE_STR="Core Only"; fi
if [ "$INSTALL_MODE" -eq 2 ]; then MODE_STR="Panel Only"; fi
if [ "$INSTALL_MODE" -eq 3 ]; then MODE_STR="Core + Panel"; fi
if [ "$INSTALL_MODE" -eq 4 ]; then MODE_STR="Core + Panel (Secure)"; fi

FW_STR="Will be configured"
if [[ "$CONF_FW" == "n" || "$CONF_FW" == "N" ]]; then FW_STR="Skipped"; fi

echo -e "" >&3
echo -e "${BLUE}==========================================================${NC}" >&3
echo -e "${GREEN}Installation Summary${NC}" >&3
echo -e "" >&3
echo -e "OS:            $OS" >&3
echo -e "Architecture:  $HEX_ARCH" >&3
echo -e "Install Mode:  $MODE_STR" >&3
echo -e "Docker:        Will be checked/installed" >&3
echo -e "Firewall:      $FW_STR" >&3
echo -e "Core Port:     $CORE_PORT" >&3
if [ "$INSTALL_MODE" -ne 1 ]; then
    echo -e "Panel Port:    $PANEL_PORT" >&3
fi
echo -e "${BLUE}==========================================================${NC}" >&3
echo -e "" >&3
read -p "Press ENTER to begin installation or Ctrl+C to cancel..." </dev/tty 

# 3. Port Check
echo -e "${CYAN}[*] Checking required ports...${NC}" >&3
check_port() {
    if command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":$1 "; then
            echo -e "${RED}[ERROR] Port $1 is already in use! Please stop the conflicting service or choose a different port.${NC}" >&3
            exit 1
        fi
    fi
}
if [ "$INSTALL_MODE" -eq 1 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then
    check_port $CORE_PORT
fi
if [ "$INSTALL_MODE" -eq 2 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then
    check_port $PANEL_PORT
fi

# 4. Dependency & Docker Installation
echo -e "${CYAN}[*] Installing dependencies & Docker...${NC}" >&3
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg ufw openssl tar wget jq iproute2 nginx
    
    if ! command -v docker &> /dev/null; then
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS "$VERSION_CODENAME" stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -y
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
elif [[ "$OS" == "fedora" || "$OS" == "rocky" || "$OS" == "almalinux" || "$OS" == "centos" ]]; then
    dnf install -y dnf-plugins-core ufw openssl tar wget curl jq iproute nginx
    if ! command -v docker &> /dev/null; then
        dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
        dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        systemctl enable docker
        systemctl start docker
    fi
else
    echo -e "${RED}[ERROR] OS $OS is currently not supported for automatic dependency installation.${NC}" >&3
    exit 1
fi

# 5. Backup & Directory Setup
echo -e "${CYAN}[*] Setting up directories...${NC}" >&3
if [ -d "/opt/hex" ]; then
    BACKUP_NAME="/opt/hex.backup-$(date +%s)"
    echo -e "${YELLOW}[!] Existing installation found. Backing up to $BACKUP_NAME${NC}" >&3
    mv /opt/hex "$BACKUP_NAME"
fi

mkdir -p /opt/hex
mkdir -p /var/lib/hex/{core,deployments_data,nginx_confs,certs}
mkdir -p /var/log/hex
mkdir -p /etc/hex

# 6. Install Core
if [ "$INSTALL_MODE" -eq 1 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then
    echo -e "${CYAN}[*] Downloading Hex Core ($HEX_ARCH)...${NC}" >&3
    DOWNLOAD_URL="https://github.com/N1N4U/Hex/releases/latest/download/hex-linux-$HEX_ARCH"
    
    if ! wget -q -O /var/lib/hex/core/hex-core "$DOWNLOAD_URL"; then
         echo -e "${RED}[ERROR] Failed to download Hex Core from $DOWNLOAD_URL.${NC}" >&3
         echo -e "${YELLOW}Please ensure you have published a GitHub Release with the asset 'hex-linux-$HEX_ARCH'.${NC}" >&3
         if [ -d "$BACKUP_NAME" ]; then
             echo -e "Rolling back..." >&3
             rm -rf /opt/hex
             mv "$BACKUP_NAME" /opt/hex
         fi
         exit 1
    fi
    chmod +x /var/lib/hex/core/hex-core
    
    echo -e "${CYAN}[*] Generating real mTLS certificates...${NC}" >&3
    cd /var/lib/hex/certs
    if [ ! -f "ca.key" ]; then
        openssl genrsa -out ca.key 4096
        openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/CN=Hex-Root-CA"
        openssl genrsa -out server.key 2048
        openssl req -new -key server.key -out server.csr -subj "/CN=hex-core"
        openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256
        openssl genrsa -out client.key 2048
        openssl req -new -key client.key -out client.csr -subj "/CN=hex-panel"
        openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 365 -sha256
    fi
    
    echo -e "${CYAN}[*] Creating Systemd Service...${NC}" >&3
    cat << EOF > /etc/systemd/system/hex-core.service
[Unit]
Description=Hex Core Daemon
After=network.target docker.service

[Service]
ExecStart=/var/lib/hex/core/hex-core --port $CORE_PORT
Restart=always
User=root
WorkingDirectory=/var/lib/hex/core

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable hex-core
    systemctl start hex-core
fi

# 7. Install CLI tool
echo -e "${CYAN}[*] Installing CLI Tool...${NC}" >&3
wget -q -O /usr/local/bin/hex "https://raw.githubusercontent.com/N1N4U/Hex/main/cli/hex.sh"
chmod +x /usr/local/bin/hex

# 8. Firewall
if [[ "$CONF_FW" == "y" || "$CONF_FW" == "Y" ]]; then
    echo -e "${CYAN}[*] Configuring Firewall...${NC}" >&3
    if command -v ufw &> /dev/null; then
        ufw allow ssh > /dev/null 2>&1
        ufw allow 80/tcp > /dev/null 2>&1
        ufw allow 443/tcp > /dev/null 2>&1
        
        # Only open Core port externally if NOT in Secure Mode (Mode 4)
        if [ "$INSTALL_MODE" -eq 1 ] || [ "$INSTALL_MODE" -eq 3 ]; then 
            ufw allow $CORE_PORT/tcp > /dev/null 2>&1
        fi
        
        if [ "$INSTALL_MODE" -eq 2 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then 
            ufw allow $PANEL_PORT/tcp > /dev/null 2>&1
        fi
        
        ufw --force enable > /dev/null 2>&1
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=80/tcp > /dev/null 2>&1
        firewall-cmd --permanent --add-port=443/tcp > /dev/null 2>&1
        if [ "$INSTALL_MODE" -eq 1 ] || [ "$INSTALL_MODE" -eq 3 ]; then 
            firewall-cmd --permanent --add-port=$CORE_PORT/tcp > /dev/null 2>&1
        fi
        
        if [ "$INSTALL_MODE" -eq 2 ] || [ "$INSTALL_MODE" -eq 3 ] || [ "$INSTALL_MODE" -eq 4 ]; then 
            firewall-cmd --permanent --add-port=$PANEL_PORT/tcp > /dev/null 2>&1
        fi
        firewall-cmd --reload > /dev/null 2>&1
    fi
fi

echo -e "${BLUE}==========================================================${NC}" >&3
echo -e "${GREEN} Hex Installation Complete! ${NC}" >&3
echo -e "${YELLOW} Logs are available at: /var/log/hex-install.log${NC}" >&3
echo "" >&3
echo -e "${YELLOW} To manage your Hex instance, use the CLI tool:${NC}" >&3
echo -e "   ${CYAN}hex help${NC}" >&3
echo -e "${BLUE}==========================================================${NC}" >&3
