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
    
    # Update Core
    echo "Downloading latest Hex Core binary..."
    DOWNLOAD_URL="https://github.com/N1N4U/Hex/releases/latest/download/hex-linux-$HEX_ARCH"
    
    if wget -q -O /tmp/hex-core-update "$DOWNLOAD_URL"; then
        chmod +x /tmp/hex-core-update
        systemctl stop hex-core
        mv /tmp/hex-core-update /var/lib/hex/core/hex-core
        systemctl start hex-core
        echo "Hex Core updated successfully."
    else
        echo "Failed to download update from $DOWNLOAD_URL. Make sure the release exists."
    fi

    # Update Panel (if running)
    if [ "$(docker ps -q -f name=hex-panel)" ]; then
        # If panel is distributed as an image
        # docker pull ghcr.io/n1n4u/hex-panel:latest
        # docker compose up -d
        echo "Panel update logic goes here..."
    fi

    echo "Update complete!"
    ;;
  *)
    print_usage
    ;;
esac
