#!/bin/bash
set -e

# Hex Global CLI
# Usage: hex <command> <target>

COMMAND=$1
TARGET=$2
SUBTARGET=$3

print_usage() {
  echo "=========================================================="
  echo "                     Hex CLI Utility                      "
  echo "=========================================================="
  echo "Choose Help command Option"
  echo "[1] Service Management"
  echo "[2] Core connection Management"
  echo "[3] System Settings Management"
  echo "[4] Backups Management"
  echo "[5] Panel Management"
  echo "[6] Diagnostics & Information"
  echo "[7] Maintenance & Developer"
  echo "=========================================================="
  echo ""
  read -p "Enter your choice [1-7]: " HELP_MODE
  
  case $HELP_MODE in
    1)
      echo "Service Management:"
      echo "  hex start [core|panel]"
      echo "  hex stop [core|panel]"
      echo "  hex restart [core|panel]"
      echo "  hex status [core|panel]"
      echo "  hex logs [core|panel]"
      echo "  hex enable [core|panel]"
      echo "  hex disable [core|panel]"
      echo "  hex reload [core|panel]"
      ;;
    2)
      echo "API & Core Management:"
      echo "  hex api create [name]"
      echo "  hex api remove [name]"
      echo "  hex api info [name]"
      echo "  hex api list"
      echo "  hex api approve <ip:port>"
      echo "  hex api deny <ip:port>"
      ;;
    3)
      echo "System Management:"
      echo "  hex update"
      echo "  hex uninstall"
      echo "  hex reinstall"
      echo "  hex repair"
      ;;
    4)
      echo "Backups (In Development):"
      echo "  hex backup create"
      echo "  hex backup restore"
      echo "  hex backup list"
      echo "  hex backup delete"
      echo "  hex migrate"
      ;;
    5)
      echo "Panel Specific:"
      echo "  hex panel install"
      echo "  hex panel update"
      echo "  hex panel restart"
      echo "  hex panel logs"
      ;;
    6)
      echo "Diagnostics & Information:"
      echo "  hex check"
      echo "  hex about"
      ;;
    7)
      echo "Maintenance & Developer:"
      echo "  hex clean"
      echo "  hex cache clear"
      echo "  hex debug"
      echo "  hex trace"
      ;;
    *)
      echo "Invalid option."
      ;;
  esac
}

if [ -z "$COMMAND" ] || [[ "$COMMAND" == "help" ]] || [[ "$COMMAND" == "cmd" ]]; then
  print_usage
  exit 0
fi

# Utility function for service management
manage_service() {
    local action=$1
    local target=$2

    if [ "$target" == "core" ]; then
        if [[ "$action" == "logs" ]]; then
            journalctl -u hex-core -f
        else
            systemctl $action hex-core
            echo "Hex Core $action executed."
        fi
    elif [ "$target" == "panel" ]; then
        if [ ! -d "/opt/hex/panel" ]; then
            echo "Hex Panel is not installed in /opt/hex/panel."
            return
        fi
        cd /opt/hex/panel
        case $action in
            start) docker compose up -d ;;
            stop) docker compose down ;;
            restart) docker compose restart ;;
            logs) docker compose logs -f ;;
            status) docker compose ps ;;
            *) echo "Unsupported action $action for panel." ;;
        esac
    else
        echo "Unknown target '$target'. Use 'core' or 'panel'."
    fi
}

case $COMMAND in
  start|stop|restart|status|logs|enable|disable|reload)
    manage_service "$COMMAND" "$TARGET"
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
    
    rm -f /tmp/hex-core-update
    if wget -q -O /tmp/hex-core-update "$DOWNLOAD_URL"; then
        chmod +x /tmp/hex-core-update
        systemctl stop hex-core || true
        mv /tmp/hex-core-update /var/lib/hex/core/hex-core
        systemctl start hex-core
        echo "Hex Core updated successfully."
    else
        echo "Failed to download update from $DOWNLOAD_URL. Make sure the release exists."
    fi

    if [ "$(docker ps -q -f name=hex-panel 2>/dev/null)" ]; then
        echo "Panel update logic goes here..."
    fi
    
    echo "Updating Hex CLI script..."
    CLI_URL="https://raw.githubusercontent.com/N1N4U/Hex/main/cli/hex.sh"
    rm -f /tmp/hex-cli-update
    if wget -q -O /tmp/hex-cli-update "$CLI_URL"; then
        mv /tmp/hex-cli-update /usr/local/bin/hex
        chmod +x /usr/local/bin/hex
        echo "Hex CLI updated successfully."
    else
        echo "Failed to download Hex CLI update."
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
    
  backup)
    case $TARGET in
        create) echo "[Stub] Creating backup..." ;;
        restore) echo "[Stub] Restoring backup..." ;;
        list) echo "[Stub] Listing backups..." ;;
        delete) echo "[Stub] Deleting backup..." ;;
        *) echo "Unknown backup command. Use create, restore, list, or delete." ;;
    esac
    ;;
    
  api)
    case $TARGET in
        create|remove|info|list|approve|deny)
            if [ -x "/var/lib/hex/core/hex-core" ]; then
                /var/lib/hex/core/hex-core "api" "$TARGET" "$SUBTARGET" "${@:4}"
            else
                echo "[ERROR] Hex Core binary not found at /var/lib/hex/core/hex-core"
                exit 1
            fi
            ;;
        *)
            echo "Unknown api command. See 'hex help' for available commands."
            ;;
    esac
    ;;
    
  panel)
    case $TARGET in
        install) echo "[Stub] Installing panel..." ;;
        update) echo "[Stub] Updating panel..." ;;
        restart) manage_service "restart" "panel" ;;
        logs) manage_service "logs" "panel" ;;
        *) echo "Unknown panel command." ;;
    esac
    ;;
    
  reinstall)
    echo "Reinstalling Hex..."
    curl -fsSL https://raw.githubusercontent.com/N1N4U/Hex/main/install.sh | bash
    ;;
    
  repair)
    echo "Repairing Hex Installation..."
    echo "Checking Docker..."
    systemctl restart docker || echo "Failed to restart docker"
    echo "Fixing permissions..."
    chown -R root:root /var/lib/hex 2>/dev/null || true
    echo "Restarting Hex Core..."
    systemctl restart hex-core || echo "Failed to restart core"
    echo "Repair complete."
    ;;
    
  migrate)
    echo "Running database migrations..."
    echo "No migrations required at this time."
    ;;
    
  check|diagnose|doctor)
    echo "Running Hex System Diagnostics..."
    echo "---------------------------------"
    echo -n "Hex Core Service: "
    systemctl is-active hex-core || echo "inactive"
    echo -n "Docker Engine: "
    docker --version || echo "Not installed"
    echo "---------------------------------"
    echo "Diagnostics complete."
    ;;
    
  about|version|info)
    echo "Hex Control Panel - CLI Utility v1.0.0"
    echo "By N1N4U"
    ;;
    
  clean|cache)
    echo "Cleaning system cache..."
    docker system prune -f
    echo "Cache cleared."
    ;;
    
  debug|trace)
    echo "Starting Hex in Debug Mode (streaming core logs)..."
    journalctl -u hex-core -f
    ;;
    
  *)
    print_usage
    ;;
esac
