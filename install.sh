#!/bin/bash
set -e

# Hex Installer
# https://github.com/N1N4U/Hex

echo "=================================================="
echo "          Hex Installation Script"
echo "=================================================="

# 1. Pre-Checks
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run as root (or use sudo)."
  exit 1
fi

OS=""
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo "Error: Unsupported OS. Cannot detect /etc/os-release."
  exit 1
fi

echo "[Info] Detected OS: $OS"

SUPPORTED_OS=("ubuntu" "debian" "fedora" "rocky" "almalinux")
if [[ ! " ${SUPPORTED_OS[@]} " =~ " ${OS} " ]]; then
  echo "Error: Unsupported OS. Supported: Ubuntu, Debian, Fedora, Rocky, AlmaLinux."
  exit 1
fi

# 2. Prompts
echo ""
echo "Select Installation Mode:"
echo "1) Core Only (Recommended for VPS nodes)"
echo "2) Panel Only"
echo "3) Core + Panel (Multi-server)"
echo "4) Core + Panel (Secure Mode - Core listens on localhost)"
read -p "Enter choice [1-4]: " INSTALL_MODE

CORE_PORT=8080
PANEL_PORT=9000

if [[ "$INSTALL_MODE" == "1" || "$INSTALL_MODE" == "3" || "$INSTALL_MODE" == "4" ]]; then
  read -p "Enter Core Port [default: $CORE_PORT]: " input_core_port
  CORE_PORT=${input_core_port:-$CORE_PORT}
fi

if [[ "$INSTALL_MODE" == "2" || "$INSTALL_MODE" == "3" || "$INSTALL_MODE" == "4" ]]; then
  read -p "Enter Panel Port [default: $PANEL_PORT]: " input_panel_port
  PANEL_PORT=${input_panel_port:-$PANEL_PORT}
fi

# 3. Dependencies
echo ""
echo "[Info] Installing dependencies..."
if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
  apt-get update -y
  apt-get install -y curl wget git tar unzip ufw nginx
elif [[ "$OS" == "fedora" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
  dnf install -y curl wget git tar unzip firewalld nginx
fi

# 4. Install Docker
if ! command -v docker &> /dev/null; then
  echo "[Info] Docker not found. Installing Docker Engine..."
  curl -fsSL https://get.docker.com | bash
  systemctl enable --now docker
else
  echo "[Info] Docker is already installed."
fi

# 5. Create Directories
echo "[Info] Creating Hex directories..."
mkdir -p /opt/hex/core
mkdir -p /opt/hex/panel
mkdir -p /etc/hex
mkdir -p /var/lib/Hex/{deployments,volumes,backups,logs,templates,plugins,cache,uploads,runtime}
mkdir -p /var/log/hex
mkdir -p /var/run/hex

# 6. Install Hex Core
if [[ "$INSTALL_MODE" == "1" || "$INSTALL_MODE" == "3" || "$INSTALL_MODE" == "4" ]]; then
  echo "[Info] Setting up Hex Core..."
  # Download from GitHub Releases in a real scenario
  # For now, we will create a placeholder binary
  echo "#!/bin/bash" > /opt/hex/core/hex-core
  echo "echo 'Hex Core running on port $CORE_PORT'" >> /opt/hex/core/hex-core
  chmod +x /opt/hex/core/hex-core
  
  cat <<EOF > /etc/systemd/system/hex-core.service
[Unit]
Description=Hex Core Daemon
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hex/core
ExecStart=/opt/hex/core/hex-core
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
  
  systemctl daemon-reload
  systemctl enable hex-core
  systemctl start hex-core
  echo "[Info] Hex Core installed and started."
fi

# 7. Install Hex Panel
if [[ "$INSTALL_MODE" == "2" || "$INSTALL_MODE" == "3" || "$INSTALL_MODE" == "4" ]]; then
  echo "[Info] Setting up Hex Panel..."
  # In a real scenario, this would download the built Next.js tar.gz and Node.js
  echo "#!/bin/bash" > /opt/hex/panel/hex-panel
  echo "echo 'Hex Panel running on port $PANEL_PORT'" >> /opt/hex/panel/hex-panel
  chmod +x /opt/hex/panel/hex-panel
  
  cat <<EOF > /etc/systemd/system/hex-panel.service
[Unit]
Description=Hex Panel Next.js BFF
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hex/panel
ExecStart=/opt/hex/panel/hex-panel
Restart=on-failure
Environment=PORT=$PANEL_PORT

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable hex-panel
  systemctl start hex-panel
  echo "[Info] Hex Panel installed and started."
fi

# 8. Firewall Configuration
echo "[Info] Configuring Firewall..."
if command -v ufw &> /dev/null; then
  ufw allow 80/tcp
  ufw allow 443/tcp
  if [[ "$INSTALL_MODE" == "1" || "$INSTALL_MODE" == "3" ]]; then
    ufw allow $CORE_PORT/tcp
  fi
  if [[ "$INSTALL_MODE" == "2" || "$INSTALL_MODE" == "3" || "$INSTALL_MODE" == "4" ]]; then
    ufw allow $PANEL_PORT/tcp
  fi
  # We assume ufw is enabled or user will enable it.
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=80/tcp
  firewall-cmd --permanent --add-port=443/tcp
  if [[ "$INSTALL_MODE" == "1" || "$INSTALL_MODE" == "3" ]]; then
    firewall-cmd --permanent --add-port=$CORE_PORT/tcp
  fi
  if [[ "$INSTALL_MODE" == "2" || "$INSTALL_MODE" == "3" || "$INSTALL_MODE" == "4" ]]; then
    firewall-cmd --permanent --add-port=$PANEL_PORT/tcp
  fi
  firewall-cmd --reload
fi

echo "=================================================="
echo "          Hex Installation Complete!"
echo "=================================================="
echo ""
echo "Configuration files: /etc/hex"
echo "Persistent data:     /var/lib/Hex"
echo "Logs:                /var/log/hex"
echo ""
echo "To create a Core API Key for a remote panel, run:"
echo "hex core create-api 'My Panel'"
