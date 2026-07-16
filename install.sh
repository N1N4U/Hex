#!/bin/bash
set -e

# Hex Core & Panel - Automated Installation Script (curl compatible)
# Supported OS: Ubuntu 22.04 / Debian 11+ (Root required)

echo "=========================================================="
echo "               Hex - Installation Script                  "
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Please run this script as root (sudo)"
  exit 1
fi

echo "[1/8] Installing dependencies (Docker, UFW, Certbot, Git)..."
apt-get update -y
apt-get install -y docker.io docker-compose-v2 ufw certbot git wget curl

echo "[2/8] Setting up Hex installation directory (/opt/hex)..."
mkdir -p /opt/hex
cd /opt/hex
if [ ! -d ".git" ]; then
  git clone https://github.com/N1N4U/Hex.git .
else
  git pull origin main
fi

echo "[3/8] Installing Go (for compiling Core)..."
if ! command -v go &> /dev/null; then
    wget https://go.dev/dl/go1.21.6.linux-amd64.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
    rm go1.21.6.linux-amd64.tar.gz
    export PATH=$PATH:/usr/local/go/bin
fi

echo "[4/8] Setting up Hex data directories..."
mkdir -p /var/lib/hex/core
mkdir -p /var/lib/hex/deployments_data
mkdir -p /var/lib/hex/nginx_confs
mkdir -p /var/lib/hex/certs

echo "[5/8] Compiling Hex Core..."
cd /opt/hex/core
/usr/local/go/bin/go build -o /var/lib/hex/core/hex-core main.go

echo "[6/8] Generating mTLS Certificates (Simulated)..."
touch /var/lib/hex/certs/ca.crt
touch /var/lib/hex/certs/server.crt
touch /var/lib/hex/certs/server.key
touch /var/lib/hex/certs/client.crt
touch /var/lib/hex/certs/client.key

echo "[7/8] Installing Systemd Service for Core..."
cp /opt/hex/core/hex-core.service /etc/systemd/system/hex-core.service
systemctl daemon-reload
systemctl enable hex-core
systemctl start hex-core

echo "[8/8] Installing Hex CLI Tool..."
cp /opt/hex/cli/hex.sh /usr/local/bin/hex
chmod +x /usr/local/bin/hex

echo "=========================================================="
echo " Hex Core Installation Complete! "
echo " It is now running on port 8080."
echo ""
echo " To manage your Hex instance, use the new global CLI tool:"
echo "   hex start core"
echo "   hex restart core"
echo "   hex update"
echo ""

read -p "Do you want to install the Next.js Panel on this server as a Docker container? (y/n): " install_panel
if [[ "$install_panel" == "y" || "$install_panel" == "Y" ]]; then
  echo "Installing Hex Panel..."
  cd /opt/hex/panel
  # Next.js requires standalone output for docker compose
  docker compose build
  docker compose up -d
  echo "Hex Panel installed and running on port 3000!"
  echo "You can manage it using: hex restart panel"
fi

echo "=========================================================="
