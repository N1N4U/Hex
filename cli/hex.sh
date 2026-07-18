#!/bin/bash
set -e

# Hex Global CLI
# Usage: hex <command> <target>

COMMAND=$1
TARGET=$2

print_usage() {
  echo "Hex CLI Utility"
  echo "Usage:"
  echo "  hex start [core|panel]"
  echo "  hex stop [core|panel]"
  echo "  hex restart [core|panel]"
  echo "  hex update"
  echo "  hex uninstall"
}

if [ -z "$COMMAND" ]; then
  print_usage
  exit 1
fi

case $COMMAND in
  start)
    if [ "$TARGET" == "core" ]; then
      systemctl start hex-core
      echo "Hex Core started."
    elif [ "$TARGET" == "panel" ]; then
      cd /opt/hex/panel && docker compose up -d
      echo "Hex Panel started."
    else
      echo "Unknown target. Use 'core' or 'panel'."
    fi
    ;;
  stop)
    if [ "$TARGET" == "core" ]; then
      systemctl stop hex-core
      echo "Hex Core stopped."
    elif [ "$TARGET" == "panel" ]; then
      cd /opt/hex/panel && docker compose down
      echo "Hex Panel stopped."
    else
      echo "Unknown target. Use 'core' or 'panel'."
    fi
    ;;
  restart)
    if [ "$TARGET" == "core" ]; then
      systemctl restart hex-core
      echo "Hex Core restarted."
    elif [ "$TARGET" == "panel" ]; then
      cd /opt/hex/panel && docker compose restart
      echo "Hex Panel restarted."
    else
      echo "Unknown target. Use 'core' or 'panel'."
    fi
    ;;
  update)
    echo "Updating Hex..."
    ARCH=$(uname -m)
    if [ "$ARCH" == "x86_64" ]; then
        HEX_ARCH="amd64"
    elif [ "$ARCH" == "aarch64" ]; then
        HEX_ARCH="arm64"
    else
        echo "Unsupported Architecture: $ARCH"
        exit 1
    fi
    
    echo "Downloading latest Hex Core binary..."
    DOWNLOAD_URL="https://github.com/N1N4U/Hex/releases/latest/download/hex-linux-$HEX_ARCH"
    
    if wget -q -O /tmp/hex-core-update "$DOWNLOAD_URL"; then
        chmod +x /tmp/hex-core-update
        systemctl stop hex-core || true
        mv /tmp/hex-core-update /var/lib/hex/core/hex-core
        systemctl start hex-core
        echo "Hex Core updated successfully."
    else
        echo "Failed to download update from $DOWNLOAD_URL. Make sure the release exists."
    fi

    if [ "$(docker ps -q -f name=hex-panel)" ]; then
        echo "Panel update logic goes here..."
    fi

    echo "Update complete!"
    ;;
  uninstall)
    if [ "$EUID" -ne 0 ]; then
      echo "[ERROR] Please run this command as root (sudo hex uninstall)"
      exit 1
    fi
    
    echo "Choose the uninstall method:"
    echo "=========================================================="
    echo ""
    echo "[1] Remove Panel Only"
    echo "[2] Remove Core Only"
    echo "[3] Remove Core + Panel (Total removal of Hex)"
    echo ""
    echo "=========================================================="
    echo ""
    read -p "Enter your choice [1-3]: " UNINSTALL_MODE
    
    if [ "$UNINSTALL_MODE" -eq 1 ] || [ "$UNINSTALL_MODE" -eq 3 ]; then
        echo "Removing Hex Panel..."
        if [ -d "/opt/hex/panel" ]; then
            cd /opt/hex/panel && docker compose down -v || true
            rm -rf /opt/hex/panel
        fi
        echo "Panel removed."
    fi
    
    if [ "$UNINSTALL_MODE" -eq 2 ] || [ "$UNINSTALL_MODE" -eq 3 ]; then
        echo "Removing Hex Core..."
        systemctl stop hex-core || true
        systemctl disable hex-core || true
        rm -f /etc/systemd/system/hex-core.service
        systemctl daemon-reload
        rm -rf /var/lib/hex/core
        rm -rf /etc/hex/core
        echo "Core removed."
    fi
    
    if [ "$UNINSTALL_MODE" -eq 3 ]; then
        echo "Performing total removal..."
        rm -rf /opt/hex
        rm -rf /var/lib/hex
        rm -rf /var/log/hex
        rm -rf /etc/hex
        rm -f /usr/local/bin/hex
        echo "Hex has been completely uninstalled from this system."
    fi
    ;;
  *)
    print_usage
    ;;
esac
