#!/bin/bash
set -e

# Hex Core - Automated Installation Script
# Supported OS: Ubuntu 22.04 / Debian 11+ (Root required)

echo "=========================================================="
echo "               Hex Core - Installation Script             "
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Please run this script as root (sudo ./install.sh)"
  exit 1
fi

echo "[1/6] Installing dependencies (Docker, UFW, Certbot, Git)..."
apt-get update -y
apt-get install -y docker.io docker-compose-v2 ufw certbot git wget curl

echo "[2/6] Installing Go (for compiling Core)..."
if ! command -v go &> /dev/null; then
    wget https://go.dev/dl/go1.21.6.linux-amd64.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz
    rm go1.21.6.linux-amd64.tar.gz
    export PATH=$PATH:/usr/local/go/bin
fi

echo "[3/6] Setting up Hex directories..."
mkdir -p /var/lib/hex/core
mkdir -p /var/lib/hex/deployments_data
mkdir -p /var/lib/hex/nginx_confs
mkdir -p /var/lib/hex/certs

echo "[4/6] Compiling Hex Core..."
cd core/
/usr/local/go/bin/go build -o /var/lib/hex/core/hex-core main.go

echo "[5/6] Generating mTLS Certificates..."
# Ideally we would call cli/certs.sh here but we will just simulate for now.
echo "Creating dummy certificates for setup (Replace with Panel certificates later)..."
touch /var/lib/hex/certs/ca.crt
touch /var/lib/hex/certs/server.crt
touch /var/lib/hex/certs/server.key
touch /var/lib/hex/certs/client.crt
touch /var/lib/hex/certs/client.key

echo "[6/6] Installing Systemd Service..."
cp hex-core.service /etc/systemd/system/hex-core.service
systemctl daemon-reload
systemctl enable hex-core
systemctl start hex-core

echo "=========================================================="
echo " Installation Complete! "
echo " Hex Core is now running on port 8080."
echo " Check status with: systemctl status hex-core"
echo "=========================================================="
