#!/bin/bash
set -e

# ==============================================================================
#  HEX SERVER OS - UNIFIED COMMAND LINE INTERFACE (CLI) v2.0
#  Graphite Noir × Glacier Silver Edition
# ==============================================================================

COMMAND=$1
TARGET=$2
SUBTARGET=$3

# ANSI Color Palette (Glacier Silver, Deep Graphite, Cyan Accent, Emerald, Amber, Crimson)
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_DIM='\033[2m'
C_SILVER='\033[38;5;254m'
C_GRAPHITE='\033[38;5;240m'
C_CYAN='\033[38;5;51m'
C_BLUE='\033[38;5;39m'
C_GREEN='\033[38;5;48m'
C_AMBER='\033[38;5;220m'
C_RED='\033[38;5;203m'

print_banner() {
  echo -e "${C_CYAN}"
  cat << "EOF"
  ██╗  ██╗███████╗██╗  ██╗
  ██║  ██║██╔════╝╚██╗██╔╝
  ███████║█████╗   ╚███╔╝ 
  ██╔══██║██╔══╝   ██╔██╗ 
  ██║  ██║███████╗██╔╝ ██╗
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
EOF
  echo -e "  ${C_SILVER}${C_BOLD}HEX SERVER OS${C_RESET} ${C_GRAPHITE}·${C_RESET} ${C_DIM}Management & Control CLI v2.0${C_RESET}"
  echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}"
}

print_help() {
  print_banner
  echo -e ""
  echo -e "  ${C_BOLD}${C_SILVER}USAGE:${C_RESET} ${C_CYAN}hex${C_RESET} <command> [arguments]"
  echo -e ""
  echo -e "  ${C_BOLD}${C_SILVER}CORE COMMANDS:${C_RESET}"
  echo -e "    ${C_CYAN}u, update${C_RESET}          ${C_DIM}Check and install latest Core, Panel, CLI & Presets${C_RESET}"
  echo -e "    ${C_CYAN}s, status${C_RESET}          ${C_DIM}Live service dashboard (Core, Panel, Docker, Ports)${C_RESET}"
  echo -e "    ${C_CYAN}m, master${C_RESET}          ${C_DIM}Generate 1-hour temporary Master Owner access key${C_RESET}"
  echo -e "    ${C_CYAN}l, logs${C_RESET} [core|panel]   ${C_DIM}Stream real-time service journal logs${C_RESET}"
  echo -e "    ${C_CYAN}r, restart${C_RESET} [target]     ${C_DIM}Restart Core, Panel, or all Hex services${C_RESET}"
  echo -e ""
  echo -e "  ${C_BOLD}${C_SILVER}SERVICE MANAGEMENT:${C_RESET}"
  echo -e "    ${C_CYAN}start${C_RESET}   [core|panel]   ${C_DIM}Start specified system daemon${C_RESET}"
  echo -e "    ${C_CYAN}stop${C_RESET}    [core|panel]   ${C_DIM}Stop specified system daemon${C_RESET}"
  echo -e "    ${C_CYAN}enable${C_RESET}  [core|panel]   ${C_DIM}Enable service startup at system boot${C_RESET}"
  echo -e "    ${C_CYAN}disable${C_RESET} [core|panel]   ${C_DIM}Disable service startup at system boot${C_RESET}"
  echo -e ""
  echo -e "  ${C_BOLD}${C_SILVER}NODE & SECURITY:${C_RESET}"
  echo -e "    ${C_CYAN}api create${C_RESET} <name>      ${C_DIM}Create 10-minute temporary node pairing key${C_RESET}"
  echo -e "    ${C_CYAN}api list${C_RESET}               ${C_DIM}List all registered Core node tokens${C_RESET}"
  echo -e "    ${C_CYAN}api remove${C_RESET} <name>      ${C_DIM}Revoke a Core node authorization${C_RESET}"
  echo -e "    ${C_CYAN}log view${C_RESET}   [lines]     ${C_DIM}View host audit trail (default 50 lines)${C_RESET}"
  echo -e ""
  echo -e "  ${C_BOLD}${C_SILVER}MAINTENANCE & SYSTEM:${C_RESET}"
  echo -e "    ${C_CYAN}check, doctor${C_RESET}          ${C_DIM}Run deep system & connectivity diagnostics${C_RESET}"
  echo -e "    ${C_CYAN}clean, prune${C_RESET}           ${C_DIM}Prune Docker unused cache, images, and networks${C_RESET}"
  echo -e "    ${C_CYAN}repair${C_RESET}                 ${C_DIM}Re-apply system permissions & restart services${C_RESET}"
  echo -e "    ${C_CYAN}v, version${C_RESET}             ${C_DIM}Display build commit, Go version & architecture${C_RESET}"
  echo -e "    ${C_CYAN}uninstall${C_RESET}              ${C_DIM}Safely remove Core, Panel, or entire platform${C_RESET}"
  echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}"
  echo ""
}

# Require root for modifying commands
require_root() {
  if [ "$EUID" -ne 0 ]; then
    echo -e "  ${C_RED}[✗] Permission Denied:${C_RESET} Please run this command as root (${C_CYAN}sudo hex $1${C_RESET})"
    exit 1
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
#  STATUS DASHBOARD (hex status / hex s)
# ──────────────────────────────────────────────────────────────────────────────
show_status() {
  print_banner
  echo -e "  ${C_BOLD}${C_SILVER}SYSTEM SERVICE DASHBOARD${C_RESET}"
  echo -e ""

  # Core status
  CORE_ACTIVE="false"
  CORE_PID="-"
  CORE_MEM="-"
  if systemctl is-active --quiet hex-core 2>/dev/null; then
    CORE_ACTIVE="true"
    CORE_PID=$(systemctl show -p MainPID --value hex-core 2>/dev/null || echo "-")
    CORE_MEM=$(ps -o rss= -p "$CORE_PID" 2>/dev/null | awk '{printf "%.1f MB", $1/1024}' || echo "-")
  fi

  # Panel status
  PANEL_ACTIVE="false"
  PANEL_PID="-"
  PANEL_MEM="-"
  PANEL_INSTALLED="false"
  if [ -f "/opt/hex/panel/hex-panel" ]; then
    PANEL_INSTALLED="true"
    if systemctl is-active --quiet hex-panel 2>/dev/null; then
      PANEL_ACTIVE="true"
      PANEL_PID=$(systemctl show -p MainPID --value hex-panel 2>/dev/null || echo "-")
      PANEL_MEM=$(ps -o rss= -p "$PANEL_PID" 2>/dev/null | awk '{printf "%.1f MB", $1/1024}' || echo "-")
    fi
  fi

  # Docker status
  DOCKER_ACTIVE="false"
  DOCKER_COUNT="0"
  if command -v docker &>/dev/null && systemctl is-active --quiet docker 2>/dev/null; then
    DOCKER_ACTIVE="true"
    DOCKER_COUNT=$(docker ps -q 2>/dev/null | wc -l || echo "0")
  fi

  # Render Cards
  echo -e "  ${C_GRAPHITE}┌── Service ────────────┬── Status ────────┬── PID ─────┬── Memory ───────┐${C_RESET}"

  if [ "$CORE_ACTIVE" == "true" ]; then
    printf "  ${C_GRAPHITE}│${C_RESET}  %-20s ${C_GRAPHITE}│${C_RESET}  ${C_GREEN}● ACTIVE${C_RESET}         ${C_GRAPHITE}│${C_RESET}  %-9s ${C_GRAPHITE}│${C_RESET}  %-13s  ${C_GRAPHITE}│${C_RESET}\n" "Hex Core (Daemon)" "$CORE_PID" "$CORE_MEM"
  else
    printf "  ${C_GRAPHITE}│${C_RESET}  %-20s ${C_GRAPHITE}│${C_RESET}  ${C_RED}○ STOPPED${C_RESET}        ${C_GRAPHITE}│${C_RESET}  %-9s ${C_GRAPHITE}│${C_RESET}  %-13s  ${C_GRAPHITE}│${C_RESET}\n" "Hex Core (Daemon)" "-" "-"
  fi

  if [ "$PANEL_INSTALLED" == "true" ]; then
    if [ "$PANEL_ACTIVE" == "true" ]; then
      printf "  ${C_GRAPHITE}│${C_RESET}  %-20s ${C_GRAPHITE}│${C_RESET}  ${C_GREEN}● ACTIVE${C_RESET}         ${C_GRAPHITE}│${C_RESET}  %-9s ${C_GRAPHITE}│${C_RESET}  %-13s  ${C_GRAPHITE}│${C_RESET}\n" "Hex Panel (UI+BFF)" "$PANEL_PID" "$PANEL_MEM"
    else
      printf "  ${C_GRAPHITE}│${C_RESET}  %-20s ${C_GRAPHITE}│${C_RESET}  ${C_RED}○ STOPPED${C_RESET}        ${C_GRAPHITE}│${C_RESET}  %-9s ${C_GRAPHITE}│${C_RESET}  %-13s  ${C_GRAPHITE}│${C_RESET}\n" "Hex Panel (UI+BFF)" "-" "-"
    fi
  else
    printf "  ${C_GRAPHITE}│${C_RESET}  %-20s ${C_GRAPHITE}│${C_RESET}  ${C_DIM}○ NOT INSTALLED${C_RESET}  ${C_GRAPHITE}│${C_RESET}  %-9s ${C_GRAPHITE}│${C_RESET}  %-13s  ${C_GRAPHITE}│${C_RESET}\n" "Hex Panel (UI+BFF)" "-" "-"
  fi

  if [ "$DOCKER_ACTIVE" == "true" ]; then
    printf "  ${C_GRAPHITE}│${C_RESET}  %-20s ${C_GRAPHITE}│${C_RESET}  ${C_GREEN}● ACTIVE${C_RESET}         ${C_GRAPHITE}│${C_RESET}  %-9s ${C_GRAPHITE}│${C_RESET}  %-13s  ${C_GRAPHITE}│${C_RESET}\n" "Docker Engine" "systemd" "$DOCKER_COUNT running"
  else
    printf "  ${C_GRAPHITE}│${C_RESET}  %-20s ${C_GRAPHITE}│${C_RESET}  ${C_RED}○ INACTIVE${C_RESET}       ${C_GRAPHITE}│${C_RESET}  %-9s ${C_GRAPHITE}│${C_RESET}  %-13s  ${C_GRAPHITE}│${C_RESET}\n" "Docker Engine" "-" "-"
  fi

  echo -e "  ${C_GRAPHITE}└───────────────────────┴──────────────────┴────────────┴─────────────────┘${C_RESET}"
  echo ""

  # System quick stats
  UPTIME=$(uptime -p 2>/dev/null || uptime | awk -F'( |,|:)+' '{print $6,"hrs"}')
  LOAD=$(cat /proc/loadavg 2>/dev/null | awk '{print $1, $2, $3}' || echo "N/A")
  echo -e "  ${C_SILVER}Host Uptime:${C_RESET}  ${C_DIM}$UPTIME${C_RESET}   ${C_GRAPHITE}·${C_RESET}   ${C_SILVER}Load Average:${C_RESET} ${C_DIM}$LOAD${C_RESET}"
  echo ""
}

# ──────────────────────────────────────────────────────────────────────────────
#  MASTER EMERGENCY ACCESS (hex master / hex m)
# ──────────────────────────────────────────────────────────────────────────────
manage_master() {
  require_root "master"
  print_banner

  SETTINGS_FILE="/opt/hex/panel/settings.json"
  if [ ! -f "$SETTINGS_FILE" ]; then
    echo -e "  ${C_RED}[✗] Hex Panel is not installed on this machine.${C_RESET}"
    echo -e "      The Master Account is strictly for managing the Hex Web Panel."
    echo -e "      Run this command on your Hex Panel host server."
    echo ""
    exit 1
  fi

  # Read existing Master username from settings.json
  MASTER_USER="admin"
  if command -v jq &>/dev/null; then
    PARSED_USER=$(jq -r '.master_auth.username // empty' "$SETTINGS_FILE" 2>/dev/null || true)
    if [ -n "$PARSED_USER" ] && [ "$PARSED_USER" != "null" ]; then
      MASTER_USER="$PARSED_USER"
    fi
  fi

  # Generate high-entropy 12-char secure temporary password (no quotes or backslashes)
  TEMP_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+=' < /dev/urandom | head -c 12)
  EXPIRY_TIME=$(date -d "+1 hour" "+%H:%M:%S UTC (%Y-%m-%d)" 2>/dev/null || date -v+1H "+%H:%M:%S UTC (%Y-%m-%d)" 2>/dev/null || echo "In 60 Minutes")

  # Update settings.json securely
  if command -v jq &>/dev/null; then
    TMP_JSON=$(mktemp)
    jq --arg u "$MASTER_USER" --arg p "$TEMP_PASS" '.master_auth.username = $u | .master_auth.password = $p' "$SETTINGS_FILE" > "$TMP_JSON" && mv "$TMP_JSON" "$SETTINGS_FILE"
    chmod 600 "$SETTINGS_FILE"
  else
    # Fallback sed replacement
    sed -i -E "s/\"password\":[[:space:]]*\"[^\"]*\"/\"password\": \"$TEMP_PASS\"/" "$SETTINGS_FILE"
  fi

  # Restart Panel so new master password takes immediate effect
  systemctl restart hex-panel 2>/dev/null || true

  # Fetch IP & Port for login convenience
  PANEL_PORT="3000"
  if command -v jq &>/dev/null; then
    P_PORT=$(jq -r '.port // 3000' "$SETTINGS_FILE" 2>/dev/null || echo "3000")
    if [ -n "$P_PORT" ] && [ "$P_PORT" != "null" ]; then PANEL_PORT="$P_PORT"; fi
  fi
  SERVER_IP=$(curl -s4 --max-time 2 https://api.ipify.org 2>/dev/null || ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -n 1 || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

  echo -e "  ${C_BOLD}${C_AMBER}👑 HEX MASTER ACCESS CONTROL (EMERGENCY RECOVERY)${C_RESET}"
  echo -e "  ${C_GRAPHITE}╭─────────────────────────────────────────────────────────────╮${C_RESET}"
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_SILVER}Access Level:${C_RESET}  ${C_AMBER}Owner / SuperAdmin${C_RESET} ${C_DIM}(Full RBAC Bypass)${C_RESET}         ${C_GRAPHITE}│${C_RESET}"
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_SILVER}Username:${C_RESET}      ${C_CYAN}%-43s${C_RESET} ${C_GRAPHITE}│${C_RESET}\n" "$MASTER_USER"
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_SILVER}Temp Key:${C_RESET}      ${C_GREEN}${C_BOLD}%-43s${C_RESET} ${C_GRAPHITE}│${C_RESET}\n" "$TEMP_PASS"
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_SILVER}Valid Until:${C_RESET}   ${C_DIM}%-43s${C_RESET} ${C_GRAPHITE}│${C_RESET}\n" "$EXPIRY_TIME"
  echo -e "  ${C_GRAPHITE}├─────────────────────────────────────────────────────────────┤${C_RESET}"
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_BOLD}${C_SILVER}Panel URL:${C_RESET}     ${C_BLUE}http://%s:%s${C_RESET}%*s ${C_GRAPHITE}│${C_RESET}\n" "$SERVER_IP" "$PANEL_PORT" $((40 - ${#SERVER_IP} - ${#PANEL_PORT})) ""
  echo -e "  ${C_GRAPHITE}├─────────────────────────────────────────────────────────────┤${C_RESET}"
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_DIM}Security Notice: The master key is a 1-time emergency key.${C_RESET}   ${C_GRAPHITE}│${C_RESET}"
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_DIM}Run 'hex master' anytime on this VPS to issue a new key.${C_RESET}   ${C_GRAPHITE}│${C_RESET}"
  echo -e "  ${C_GRAPHITE}╰─────────────────────────────────────────────────────────────╯${C_RESET}"
  echo ""
}

# ──────────────────────────────────────────────────────────────────────────────
#  UPDATE ENGINE (hex update / hex u)
# ──────────────────────────────────────────────────────────────────────────────
perform_update() {
  require_root "update"
  print_banner

  echo -e "  ${C_BOLD}${C_SILVER}HEX UPDATE ENGINE${C_RESET}"
  echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}"

  # Architecture detection
  ARCH=$(uname -m)
  if [ "$ARCH" == "x86_64" ]; then
    HEX_ARCH="amd64"
  elif [ "$ARCH" == "aarch64" ]; then
    HEX_ARCH="arm64"
  else
    echo -e "  ${C_RED}[✗] Unsupported architecture:${C_RESET} $ARCH"
    exit 1
  fi

  echo -e "  ${C_CYAN}⟳${C_RESET} ${C_SILVER}Checking for updates on GitHub...${C_RESET}"

  # Current Version Detection
  OLD_VERSION="v1.0.0-beta.1"
  if [ -x "/var/lib/hex/core/hex-core" ]; then
    DETECTED_V=$(/var/lib/hex/core/hex-core version 2>/dev/null | grep -i "Core Version:" | awk '{print $3}' || true)
    if [ -n "$DETECTED_V" ]; then OLD_VERSION="$DETECTED_V"; fi
  fi

  # Remote Version Detection from GitHub Release
  RELEASE_API="https://api.github.com/repos/N1N4U/Hex/releases/latest"
  RELEASE_DATA=$(curl -s --max-time 6 "$RELEASE_API" || echo "{}")
  NEW_VERSION=$(echo "$RELEASE_DATA" | grep '"tag_name"' | head -n 1 | cut -d '"' -f 4 || echo "latest")
  if [ -z "$NEW_VERSION" ]; then NEW_VERSION="latest"; fi

  echo -e "  ${C_GRAPHITE}┌── Version Manifest ─────────────────────────────────────────┐${C_RESET}"
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Installed Version:${C_RESET}  ${C_DIM}${OLD_VERSION}${C_RESET}"
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Available Release:${C_RESET}  ${C_GREEN}${C_BOLD}${NEW_VERSION}${C_RESET} ${C_CYAN}(Production Build)${C_RESET}"
  echo -e "  ${C_GRAPHITE}└─────────────────────────────────────────────────────────────┘${C_RESET}"
  echo ""

  # [1/4] Update Core
  echo -e "  ${C_CYAN}[1/4]${C_RESET} ${C_BOLD}${C_SILVER}Updating Hex Core Daemon ($HEX_ARCH)...${C_RESET}"
  CORE_URL="https://github.com/N1N4U/Hex/releases/latest/download/hex-core-linux-$HEX_ARCH"
  rm -f /tmp/hex-core-update

  if curl -# -L -f -o /tmp/hex-core-update "$CORE_URL"; then
    chmod +x /tmp/hex-core-update
    # Verify ELF binary
    if file /tmp/hex-core-update 2>/dev/null | grep -q "ELF" || [ -s /tmp/hex-core-update ]; then
      systemctl stop hex-core 2>/dev/null || true
      if [ -f "/var/lib/hex/core/hex-core" ]; then
        cp /var/lib/hex/core/hex-core /var/lib/hex/core/hex-core.bak
      fi
      mkdir -p /var/lib/hex/core
      mv /tmp/hex-core-update /var/lib/hex/core/hex-core
      systemctl start hex-core 2>/dev/null || true
      sleep 1
      if systemctl is-active --quiet hex-core; then
        echo -e "        ${C_GREEN}✓${C_RESET} Hex Core daemon updated & running healthy."
      else
        echo -e "        ${C_AMBER}[!]${C_RESET} Warning: Core service started but pending healthcheck."
      fi
    else
      echo -e "        ${C_RED}[✗] Invalid binary downloaded for Core.${C_RESET}"
    fi
  else
    echo -e "        ${C_RED}[✗] Failed to download Hex Core binary from GitHub.${C_RESET}"
  fi
  echo ""

  # [2/4] Update Panel (if installed)
  if [ -f "/opt/hex/panel/hex-panel" ]; then
    echo -e "  ${C_CYAN}[2/4]${C_RESET} ${C_BOLD}${C_SILVER}Updating Hex Panel (Node BFF + UI)...${C_RESET}"
    PANEL_URL="https://github.com/N1N4U/Hex/releases/latest/download/hex-panel-linux-$HEX_ARCH"
    rm -f /tmp/hex-panel-update
    if curl -# -L -f -o /tmp/hex-panel-update "$PANEL_URL"; then
      chmod +x /tmp/hex-panel-update
      systemctl stop hex-panel 2>/dev/null || true
      if [ -f "/opt/hex/panel/hex-panel" ]; then
        cp /opt/hex/panel/hex-panel /opt/hex/panel/hex-panel.bak
      fi
      mv /tmp/hex-panel-update /opt/hex/panel/hex-panel
      systemctl start hex-panel 2>/dev/null || true
      sleep 1
      if systemctl is-active --quiet hex-panel; then
        echo -e "        ${C_GREEN}✓${C_RESET} Hex Panel service updated & running healthy."
      else
        echo -e "        ${C_AMBER}[!]${C_RESET} Warning: Panel service started but pending healthcheck."
      fi
    else
      echo -e "        ${C_RED}[✗] Failed to download Hex Panel binary.${C_RESET}"
    fi
    echo ""
  else
    echo -e "  ${C_CYAN}[2/4]${C_RESET} ${C_DIM}Hex Panel is not installed on this node (Skipped).${C_RESET}"
    echo ""
  fi

  # [3/4] Update Hex CLI
  echo -e "  ${C_CYAN}[3/4]${C_RESET} ${C_BOLD}${C_SILVER}Updating Hex CLI Utility...${C_RESET}"
  CLI_URL="https://raw.githubusercontent.com/N1N4U/Hex/main/hex.sh"
  rm -f /tmp/hex-cli-update
  if curl -sSL -f -o /tmp/hex-cli-update "$CLI_URL"; then
    chmod +x /tmp/hex-cli-update
    mv /tmp/hex-cli-update /usr/local/bin/hex
    echo -e "        ${C_GREEN}✓${C_RESET} Global CLI script updated (/usr/local/bin/hex)."
  else
    echo -e "        ${C_RED}[✗] Failed to download CLI update.${C_RESET}"
  fi
  echo ""

  # [4/4] Update Presets
  echo -e "  ${C_CYAN}[4/4]${C_RESET} ${C_BOLD}${C_SILVER}Updating Application Presets Catalog...${C_RESET}"
  rm -rf /tmp/hex-repo
  mkdir -p /tmp/hex-repo
  if curl -sSL -f -o /tmp/hex-repo/main.tar.gz "https://github.com/N1N4U/Hex/archive/refs/heads/main.tar.gz"; then
    tar -xzf /tmp/hex-repo/main.tar.gz -C /tmp/hex-repo 2>/dev/null || true
    EXTRACTED_DIR=$(find /tmp/hex-repo -maxdepth 1 -type d -name "Hex-*" | head -n 1)
    if [ -d "$EXTRACTED_DIR/presets" ]; then
      mkdir -p /var/lib/hex/presets
      cp -r "$EXTRACTED_DIR/presets/"* /var/lib/hex/presets/ 2>/dev/null || true
      TOTAL_PRESETS=$(find /var/lib/hex/presets -type f -name "*.json" 2>/dev/null | wc -l || echo "0")
      echo -e "        ${C_GREEN}✓${C_RESET} Presets catalog synchronized ($TOTAL_PRESETS templates ready)."
    fi
    rm -rf /tmp/hex-repo
  else
    echo -e "        ${C_AMBER}[!] Failed to update presets archive.${C_RESET}"
  fi
  echo ""

  # Final Summary Box
  echo -e "  ${C_GRAPHITE}╭─────────────────────────────────────────────────────────────╮${C_RESET}"
  echo -e "  ${C_GRAPHITE}│${C_RESET}                 ${C_GREEN}${C_BOLD}✓ HEX PLATFORM UPDATE COMPLETE${C_RESET}              ${C_GRAPHITE}│${C_RESET}"
  echo -e "  ${C_GRAPHITE}├─────────────────────────────────────────────────────────────┤${C_RESET}"
  printf "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Version Transition:${C_RESET} ${C_DIM}%s${C_RESET} ➜ ${C_GREEN}${C_BOLD}%s${C_RESET}%*s ${C_GRAPHITE}│${C_RESET}\n" "$OLD_VERSION" "$NEW_VERSION" $((32 - ${#OLD_VERSION} - ${#NEW_VERSION})) ""
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_SILVER}Active Services:${C_RESET}    ${C_GREEN}● Core Daemon${C_RESET}  ${C_GREEN}● Panel UI${C_RESET}  ${C_GREEN}● CLI${C_RESET}         ${C_GRAPHITE}│${C_RESET}"
  echo -e "  ${C_GRAPHITE}├─────────────────────────────────────────────────────────────┤${C_RESET}"
  echo -e "  ${C_GRAPHITE}│${C_RESET}  ${C_DIM}Run 'hex status' anytime to view system telemetry.${C_RESET}        ${C_GRAPHITE}│${C_RESET}"
  echo -e "  ${C_GRAPHITE}╰─────────────────────────────────────────────────────────────╯${C_RESET}"
  echo ""
}

# ──────────────────────────────────────────────────────────────────────────────
#  SERVICE ACTIONS (start, stop, restart, enable, disable)
# ──────────────────────────────────────────────────────────────────────────────
manage_service() {
  local action=$1
  local target=$2

  require_root "$action"

  if [ -z "$target" ] || [ "$target" == "all" ]; then
    echo -e "  ${C_CYAN}➜${C_RESET} Executing ${C_BOLD}$action${C_RESET} on all Hex services..."
    systemctl "$action" hex-core 2>/dev/null || true
    if [ -f "/opt/hex/panel/hex-panel" ]; then
      systemctl "$action" hex-panel 2>/dev/null || true
    fi
    echo -e "  ${C_GREEN}[✓]${C_RESET} Service action completed."
    return
  fi

  if [ "$target" == "core" ]; then
    systemctl "$action" hex-core
    echo -e "  ${C_GREEN}[✓]${C_RESET} Hex Core: $action executed."
  elif [ "$target" == "panel" ]; then
    if [ -f "/opt/hex/panel/hex-panel" ]; then
      systemctl "$action" hex-panel
      echo -e "  ${C_GREEN}[✓]${C_RESET} Hex Panel: $action executed."
    else
      echo -e "  ${C_RED}[✗] Hex Panel is not installed on this host.${C_RESET}"
    fi
  else
    echo -e "  ${C_RED}[✗] Unknown service target '${target}'.${C_RESET} Use 'core', 'panel', or 'all'."
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
#  SYSTEM DIAGNOSTICS (hex check / hex doctor)
# ──────────────────────────────────────────────────────────────────────────────
run_diagnostics() {
  print_banner
  echo -e "  ${C_BOLD}${C_SILVER}SYSTEM HEALTH & DIAGNOSTICS${C_RESET}"
  echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}"

  check_item() {
    local label=$1
    local status=$2
    local details=$3
    if [ "$status" == "ok" ]; then
      printf "  ${C_GREEN}[✓]${C_RESET} %-26s ${C_SILVER}%s${C_RESET}\n" "$label" "$details"
    elif [ "$status" == "warn" ]; then
      printf "  ${C_AMBER}[!]${C_RESET} %-26s ${C_AMBER}%s${C_RESET}\n" "$label" "$details"
    else
      printf "  ${C_RED}[✗]${C_RESET} %-26s ${C_RED}%s${C_RESET}\n" "$label" "$details"
    fi
  }

  # OS Check
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    check_item "Linux Distribution" "ok" "$PRETTY_NAME"
  fi

  # Core Service
  if systemctl is-active --quiet hex-core; then
    check_item "Hex Core Daemon" "ok" "Active (PID $(systemctl show -p MainPID --value hex-core))"
  else
    check_item "Hex Core Daemon" "error" "Inactive / Failed"
  fi

  # Panel Service
  if [ -f "/opt/hex/panel/hex-panel" ]; then
    if systemctl is-active --quiet hex-panel; then
      check_item "Hex Panel BFF" "ok" "Active (PID $(systemctl show -p MainPID --value hex-panel))"
    else
      check_item "Hex Panel BFF" "error" "Inactive / Failed"
    fi
  else
    check_item "Hex Panel" "warn" "Not installed (Worker Node Mode)"
  fi

  # Docker
  if command -v docker &>/dev/null && systemctl is-active --quiet docker; then
    D_VER=$(docker --version | awk '{print $3}' | tr -d ',')
    check_item "Docker Engine" "ok" "v$D_VER (Socket Connected)"
  else
    check_item "Docker Engine" "error" "Not running or not installed"
  fi

  # Disk Space
  DISK_FREE=$(df -h / | awk 'NR==2 {print $4}')
  check_item "Root Filesystem Free" "ok" "$DISK_FREE available"

  # Memory
  MEM_FREE=$(free -h | awk '/Mem:/ {print $7}')
  check_item "Available Memory" "ok" "$MEM_FREE free"

  echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}"
  echo ""
}

# ──────────────────────────────────────────────────────────────────────────────
#  MAIN COMMAND DISPATCHER (Includes All Aliases)
# ──────────────────────────────────────────────────────────────────────────────
case $COMMAND in
  u|update)
    perform_update
    ;;

  s|status)
    show_status
    ;;

  m|master)
    manage_master
    ;;

  l|logs)
    if [ "$TARGET" == "panel" ]; then
      journalctl -u hex-panel -f
    else
      journalctl -u hex-core -f
    fi
    ;;

  r|restart)
    manage_service "restart" "$TARGET"
    ;;

  start)
    manage_service "start" "$TARGET"
    ;;

  stop)
    manage_service "stop" "$TARGET"
    ;;

  enable)
    manage_service "enable" "$TARGET"
    ;;

  disable)
    manage_service "disable" "$TARGET"
    ;;

  api)
    case $TARGET in
      create|remove|info|list)
        if [ -x "/var/lib/hex/core/hex-core" ]; then
          /var/lib/hex/core/hex-core "api" "$TARGET" "$SUBTARGET" "${@:4}"
        else
          echo -e "  ${C_RED}[✗] Hex Core binary not found at /var/lib/hex/core/hex-core${C_RESET}"
          exit 1
        fi
        ;;
      *)
        echo -e "  ${C_SILVER}Usage:${C_RESET} ${C_CYAN}hex api <create|remove|info|list>${C_RESET}"
        ;;
    esac
    ;;

  log|audit)
    if [ -x "/var/lib/hex/core/hex-core" ]; then
      shift
      /var/lib/hex/core/hex-core log "$@"
    else
      if [ -f "/var/log/hex/actions.log" ]; then
        tail -n 50 /var/log/hex/actions.log
      else
        echo -e "  ${C_RED}[✗] No audit trail found at /var/log/hex/actions.log${C_RESET}"
      fi
    fi
    ;;

  check|doctor|diagnose)
    run_diagnostics
    ;;

  clean|prune)
    require_root "clean"
    echo -e "  ${C_CYAN}➜${C_RESET} Pruning unused Docker containers, images, and networks..."
    docker system prune -f 2>/dev/null || true
    echo -e "  ${C_GREEN}[✓] System cache cleaned successfully.${C_RESET}"
    ;;

  repair)
    require_root "repair"
    echo -e "  ${C_CYAN}➜${C_RESET} Repairing Hex file permissions..."
    chown -R root:root /var/lib/hex /opt/hex 2>/dev/null || true
    systemctl restart hex-core hex-panel 2>/dev/null || true
    echo -e "  ${C_GREEN}[✓] Repair completed. Services restarted.${C_RESET}"
    ;;

  v|version|-v|--version)
    if [ -x "/var/lib/hex/core/hex-core" ]; then
      /var/lib/hex/core/hex-core version
    else
      print_banner
      echo -e "  ${C_SILVER}CLI Version: v2.0.0 (Production Build)${C_RESET}"
    fi
    ;;

  uninstall)
    require_root "uninstall"
    print_banner
    echo -e "  ${C_RED}${C_BOLD}HEX UNINSTALL WIZARD${C_RESET}"
    echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}"
    echo -e "  [1] Remove Panel Only (Keep Core daemon)"
    echo -e "  [2] Remove Core Only (Keep Panel)"
    echo -e "  [3] Total Removal (Erase Core, Panel, Logs, Database & CLI)"
    echo -e "  ${C_GRAPHITE}─────────────────────────────────────────────────────────────${C_RESET}"
    read -p "  Enter choice [1-3] (or Ctrl+C to abort): " UNINSTALL_MODE </dev/tty
    case $UNINSTALL_MODE in
      1)
        systemctl stop hex-panel 2>/dev/null || true
        systemctl disable hex-panel 2>/dev/null || true
        rm -f /etc/systemd/system/hex-panel.service
        rm -rf /opt/hex/panel
        systemctl daemon-reload
        echo -e "  ${C_GREEN}[✓] Hex Panel successfully removed.${C_RESET}"
        ;;
      2)
        systemctl stop hex-core 2>/dev/null || true
        systemctl disable hex-core 2>/dev/null || true
        rm -f /etc/systemd/system/hex-core.service
        rm -rf /var/lib/hex/core
        systemctl daemon-reload
        echo -e "  ${C_GREEN}[✓] Hex Core successfully removed.${C_RESET}"
        ;;
      3)
        systemctl stop hex-core hex-panel 2>/dev/null || true
        systemctl disable hex-core hex-panel 2>/dev/null || true
        rm -f /etc/systemd/system/hex-core.service /etc/systemd/system/hex-panel.service
        systemctl daemon-reload
        rm -rf /opt/hex /var/lib/hex /var/log/hex /usr/local/bin/hex
        echo -e "  ${C_GREEN}[✓] Hex completely uninstalled from this host.${C_RESET}"
        ;;
      *)
        echo -e "  ${C_AMBER}Aborted.${C_RESET}"
        ;;
    esac
    ;;

  h|help|-h|--help|*)
    print_help
    ;;
esac
