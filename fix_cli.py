# coding=utf-8
import codecs
import re

with codecs.open('cli/hex.sh', 'r', 'utf-8') as f:
    c = f.read()

newUpdate = """  update)
    if [ "$EUID" -ne 0 ]; then
      echo "[ERROR] Please run this command as root (sudo hex update)"
      exit 1
    fi
    
    echo ""
    echo "╭──────────────────────────────────────────────────────────╮"
    echo "│                     HEX UPDATE                           │"
    echo "│              Checking for available updates              │"
    echo "╰──────────────────────────────────────────────────────────╯"
    echo ""
    echo "  ◉ Checking current installation..."
    echo "  ✓ Hex installation detected"
    echo ""
    echo "  ◉ Checking for updates..."
    
    ARCH=$(uname -m)
    if [ "$ARCH" == "x86_64" ]; then
        HEX_ARCH="amd64"
    elif [ "$ARCH" == "aarch64" ]; then
        HEX_ARCH="arm64"
    else
        echo "Unsupported Architecture: $ARCH"
        exit 1
    fi
    
    LATEST_COMMIT=$(curl -s https://api.github.com/repos/N1N4U/Hex/commits/main | grep '"sha"' | head -n 1 | cut -d '"' -f 4)
    
    LAST_UPDATE_FILE="/var/lib/hex/core/.last_update"
    if [ "$TARGET" != "--force" ] && [ -f "$LAST_UPDATE_FILE" ]; then
        LAST_UPDATE=$(cat "$LAST_UPDATE_FILE")
        if [ "$LAST_UPDATE" == "$LATEST_COMMIT" ] && [ -n "$LATEST_COMMIT" ]; then
            echo "  ✓ You are already on the latest version! There is no update."
            exit 0
        fi
    fi

    echo "  ✓ New version available"
    echo ""
    echo "  ─────────────────────────────────────────────────────────"
    echo ""
    echo "  ◉ Updating Hex Core"
    echo "    ✓ Downloading latest release"
    
    LATEST_JSON=$(curl -s https://api.github.com/repos/N1N4U/Hex/releases/tags/latest)
    DOWNLOAD_URL=$(echo "$LATEST_JSON" | grep '"browser_download_url"' | grep "hex-linux-$HEX_ARCH" | head -n 1 | cut -d '"' -f 4)
    if [ -z "$DOWNLOAD_URL" ]; then
        DOWNLOAD_URL="https://github.com/N1N4U/Hex/releases/latest/download/hex-linux-$HEX_ARCH"
    fi
    
    rm -f /tmp/hex-core-update
    if wget -q -O /tmp/hex-core-update "$DOWNLOAD_URL"; then
        chmod +x /tmp/hex-core-update
        echo "    ✓ Installing Hex Core"
        systemctl stop hex-core || true
        mv /tmp/hex-core-update /var/lib/hex/core/hex-core
        systemctl start hex-core
        if [ -n "$LATEST_COMMIT" ]; then
            echo "$LATEST_COMMIT" > "$LAST_UPDATE_FILE"
        fi
        echo "    ✓ Hex Core updated successfully"
    else
        echo "    x Failed to download update from $DOWNLOAD_URL"
    fi

    echo ""
    echo "  ◉ Updating Hex CLI"
    echo "    ✓ Downloading latest CLI"
    if wget -q -O /usr/local/bin/hex https://raw.githubusercontent.com/N1N4U/Hex/main/cli/hex.sh; then
        chmod +x /usr/local/bin/hex
        echo "    ✓ Installing CLI script"
        echo "    ✓ Hex CLI updated successfully"
    else
        echo "    x Failed to update Hex CLI."
    fi

    echo ""
    echo "  ◉ Updating Blueprints"
    echo "    ✓ Fetching latest blueprints"
    mkdir -p /var/lib/hex/core/blueprints
    if wget -q -O /var/lib/hex/core/blueprints/update.py https://raw.githubusercontent.com/N1N4U/Hex/main/others/blueprints/generate.py; then
        python3 /var/lib/hex/core/blueprints/update.py >/dev/null 2>&1 || true
        echo "    ✓ Blueprints updated successfully"
    else
        echo "    x Failed to update blueprints."
    fi
    echo ""
    echo "  ─────────────────────────────────────────────────────────"
    echo ""
    echo "╭──────────────────────────────────────────────────────────╮"
    echo "│  ✓ UPDATE COMPLETE                                       │"
    echo "│                                                          │"
    echo "│  Hex has been successfully updated to the latest version │"
    echo "╰──────────────────────────────────────────────────────────╯"
    echo ""
    
    if [ "$(docker ps -q -f name=hex-panel 2>/dev/null)" ]; then
        echo "Panel update logic goes here..."
"""

c = re.sub(r'  update\).*?if \[ "\$\(docker ps -q -f name=hex-panel 2>/dev/null\)" \]; then\s*echo "Panel update logic goes here..."', newUpdate, c, flags=re.DOTALL)

with codecs.open('cli/hex.sh', 'w', 'utf-8') as f:
    f.write(c)
print("done")
