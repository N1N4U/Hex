#!/bin/bash
set -e

# Hex Core & Panel - Automated Installation
# Supported OS: Ubuntu 22.04 / Debian 11+ (Root required)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
cat << "EOF"
  _    _ ______   __
 | |  | |  ____|  \ \/ /
 | |__| | |__      \  / 
 |  __  |  __|     /  \ 
 | |  | | |____   / /\ \
 |_|  |_|______| /_/  \_\
EOF
echo -e "${NC}"
echo -e "${BLUE}==========================================================${NC}"
echo -e "${GREEN}               Hex - Installation                 ${NC}"
echo -e "${YELLOW}               Author: N1N4U                              ${NC}"
echo -e "${BLUE}==========================================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root (sudo)${NC}"
  exit 1
fi

echo -e "${CYAN}[1/8] Installing dependencies (Docker, UFW, Certbot, Git)...${NC}"
apt-get update -y
apt-get install -y ufw certbot git wget curl

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo -e "${GREEN}Docker is already installed.${NC}"
fi

echo -e "${CYAN}[2/8] Setting up Hex installation directory (/opt/hex)...${NC}"
mkdir -p /opt/hex
cd /opt/hex
if [ ! -d ".git" ]; then
  git clone https://github.com/N1N4U/Hex.git .
else
  git pull origin main
fi

echo -e "${CYAN}[3/8] Installing Go (for compiling Core)...${NC}"
if ! command -v go &> /dev/null; then
    wget https://go.dev/dl/go1.21.6.linux-amd64.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
    rm go1.21.6.linux-amd64.tar.gz
    export PATH=$PATH:/usr/local/go/bin
fi

echo -e "${CYAN}[4/8] Setting up Hex data directories...${NC}"
mkdir -p /var/lib/hex/core
mkdir -p /var/lib/hex/deployments_data
mkdir -p /var/lib/hex/nginx_confs
mkdir -p /var/lib/hex/certs

echo -e "${CYAN}[5/8] Compiling Hex Core...${NC}"
cd /opt/hex/core
/usr/local/go/bin/go build -o /var/lib/hex/core/hex-core main.go

echo -e "${CYAN}[6/8] Generating mTLS Certificates (Simulated)...${NC}"
touch /var/lib/hex/certs/ca.crt
touch /var/lib/hex/certs/server.crt
touch /var/lib/hex/certs/server.key
touch /var/lib/hex/certs/client.crt
touch /var/lib/hex/certs/client.key

echo -e "${CYAN}[7/8] Installing Systemd Service for Core...${NC}"
cp /opt/hex/core/hex-core.service /etc/systemd/system/hex-core.service
systemctl daemon-reload
systemctl enable hex-core
systemctl start hex-core

echo -e "${CYAN}[8/8] Installing Hex CLI Tool...${NC}"
cp /opt/hex/cli/hex.sh /usr/local/bin/hex
chmod +x /usr/local/bin/hex

echo -e "${BLUE}==========================================================${NC}"
echo -e "${GREEN} Hex Core Installation Complete! ${NC}"
echo -e "${GREEN} It is now running on port 8080.${NC}"
echo ""
echo -e "${YELLOW} To manage your Hex instance, use the new global CLI tool:${NC}"
echo -e "   ${CYAN}hex start core${NC}"
echo -e "   ${CYAN}hex restart core${NC}"
echo -e "   ${CYAN}hex update${NC}"
echo ""

read -p "Do you want to install the Next.js Panel on this server as a Docker container? (y/n): " install_panel
if [[ "$install_panel" == "y" || "$install_panel" == "Y" ]]; then
  echo -e "${CYAN}Installing Hex Panel...${NC}"
  cd /opt/hex/panel
  # Next.js requires standalone output for docker compose
  docker compose build
  docker compose up -d
  echo -e "${GREEN}Hex Panel installed and running on port 3000!${NC}"
  echo -e "${YELLOW}You can manage it using: hex restart panel${NC}"
fi

echo -e "${BLUE}==========================================================${NC}"
