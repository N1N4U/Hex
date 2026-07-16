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
    cd /opt/hex
    git pull origin main

    # Update Core
    echo "Recompiling Hex Core..."
    cd /opt/hex/core
    /usr/local/go/bin/go build -o /var/lib/hex/core/hex-core main.go
    systemctl restart hex-core

    # Update Panel (if running)
    if [ "$(docker ps -q -f name=hex-panel)" ]; then
        echo "Rebuilding Hex Panel Docker image..."
        cd /opt/hex/panel
        docker compose build
        docker compose up -d
    fi

    echo "Update complete!"
    ;;
  *)
    print_usage
    ;;
esac
