<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Plus, X, Terminal as TerminalIcon, RefreshCw, Power, PowerOff, Send, ArrowDown } from '@lucide/svelte';
  import Dialog from '$lib/ui/overlay/Dialog.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';

  interface TerminalSession {
    id: string;
    name: string;
    ip: string;
    port: number;
    username: string;
    password?: string;
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
  }

  interface ActiveTerminal {
    xterm: any;
    fitAddon: any;
    ws: WebSocket | null;
    container: HTMLDivElement | null;
  }

  let sessions = $state<TerminalSession[]>([
    {
      id: 'term-1',
      name: 'Terminal 1',
      ip: '',
      port: 22,
      username: 'root',
      status: 'disconnected'
    }
  ]);

  let activeSessionId = $state<string>('term-1');
  let activeTerminals: Record<string, ActiveTerminal> = {};
  let containerElements: Record<string, HTMLDivElement> = {};

  let showAddDialog = $state(false);
  let isConnecting = $state(false);
  let autoScroll = $state(true);
  let quickCmd = $state('');

  // Dialog fields
  let newName = $state('Terminal 1');
  let newIp = $state('');
  let newPort = $state<number>(22);
  let newUser = $state('root');
  let newPass = $state('');

  let XTermModule: any = null;
  let FitAddonModule: any = null;
  let WebLinksAddonModule: any = null;

  const activeSession = $derived(sessions.find((s) => s.id === activeSessionId));
  const isAnyConnected = $derived(sessions.some((s) => s.status === 'connected' || s.status === 'connecting'));

  onMount(async () => {
    try {
      const xtermMod = await import('@xterm/xterm');
      const fitMod = await import('@xterm/addon-fit');
      const weblinksMod = await import('@xterm/addon-web-links');
      await import('@xterm/xterm/css/xterm.css');

      XTermModule = xtermMod.Terminal;
      FitAddonModule = fitMod.FitAddon;
      WebLinksAddonModule = weblinksMod.WebLinksAddon;

      // Initialize initial session container if it exists
      await tick();
      const firstSession = sessions[0];
      if (firstSession && containerElements[firstSession.id]) {
        mountXterm(firstSession);
      }
    } catch (err) {
      console.error('Failed to load XTerm modules', err);
    }

    const handleResize = () => {
      const active = activeTerminals[activeSessionId];
      if (active?.fitAddon) {
        try {
          active.fitAddon.fit();
          if (active.ws && active.ws.readyState === WebSocket.OPEN && active.xterm) {
            active.ws.send(JSON.stringify({
              type: 'resize',
              cols: active.xterm.cols,
              rows: active.xterm.rows
            }));
          }
        } catch {}
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      for (const key of Object.keys(activeTerminals)) {
        const item = activeTerminals[key];
        item?.ws?.close();
        item?.xterm?.dispose();
      }
    };
  });

  function mountXterm(session: TerminalSession) {
    if (!XTermModule || !containerElements[session.id]) return;
    if (activeTerminals[session.id]) return;

    const term = new XTermModule({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      theme: {
        background: '#0a0d14',
        foreground: '#e2e8f0',
        cursor: '#22c55e',
        selectionBackground: 'rgba(34, 197, 94, 0.25)',
        black: '#0f172a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f8fafc'
      }
    });

    const fitAddon = new FitAddonModule();
    term.loadAddon(fitAddon);
    if (WebLinksAddonModule) {
      term.loadAddon(new WebLinksAddonModule());
    }

    term.open(containerElements[session.id]);
    setTimeout(() => {
      try { fitAddon.fit(); } catch {}
    }, 50);

    activeTerminals[session.id] = {
      xterm: term,
      fitAddon,
      ws: null,
      container: containerElements[session.id]
    };
  }

  function connectSession(session: TerminalSession) {
    if (!session.ip) {
      handleOpenAdd(session);
      return;
    }

    // Disconnect any other sessions to enforce: at a time we can only connect to a single terminal
    for (const other of sessions) {
      if (other.id !== session.id && (other.status === 'connected' || other.status === 'connecting')) {
        const otherTerm = activeTerminals[other.id];
        otherTerm?.ws?.close();
        other.status = 'disconnected';
      }
    }

    const termItem = activeTerminals[session.id];
    if (!termItem) return;

    if (termItem.ws && termItem.ws.readyState === WebSocket.OPEN) {
      termItem.ws.close();
    }

    session.status = 'connecting';
    termItem.xterm.writeln(`\r\n\x1b[33m[Connecting via SSH to ${session.username}@${session.ip}:${session.port}...]\x1b[0m\r\n`);

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${proto}://${location.host}/api/v1/terminal/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      termItem.ws = ws;

      ws.onopen = () => {
        session.status = 'connected';
        ws.send(JSON.stringify({
          type: 'connect',
          ip: session.ip,
          port: session.port || 22,
          username: session.username || 'root',
          password: session.password || '',
          cols: termItem.xterm.cols || 80,
          rows: termItem.xterm.rows || 24
        }));
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          termItem.xterm.write(ev.data);
        } else {
          termItem.xterm.write(new Uint8Array(ev.data));
        }
        if (autoScroll) {
          termItem.xterm.scrollToBottom();
        }
      };

      ws.onclose = () => {
        session.status = 'disconnected';
        termItem.xterm.writeln('\r\n\x1b[33m[SSH connection closed]\x1b[0m\r\n');
      };

      ws.onerror = () => {
        session.status = 'error';
        termItem.xterm.writeln('\r\n\x1b[31m[WebSocket connection error]\x1b[0m\r\n');
      };

      termItem.xterm.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    } catch (err: any) {
      session.status = 'error';
      termItem.xterm.writeln(`\r\n\x1b[31m[Error opening WebSocket: ${err?.message}]\x1b[0m\r\n`);
    }
  }

  async function switchTab(id: string) {
    activeSessionId = id;
    await tick();
    const session = sessions.find((s) => s.id === id);
    if (session) {
      if (!activeTerminals[id] && containerElements[id]) {
        mountXterm(session);
      }
      const active = activeTerminals[id];
      if (active?.fitAddon) {
        setTimeout(() => {
          try {
            active.fitAddon.fit();
            active.xterm.focus();
          } catch {}
        }, 30);
      }
    }
  }

  function handleOpenAdd(existingSession?: TerminalSession) {
    if (isAnyConnected && !existingSession) {
      addToast('Please disconnect the current terminal first. Only a single connection is allowed at a time.', 'warning');
      return;
    }

    if (existingSession && existingSession.ip) {
      newName = existingSession.name;
      newIp = existingSession.ip;
      newPort = existingSession.port;
      newUser = existingSession.username;
      newPass = existingSession.password || '';
    } else {
      const nextNum = sessions.length + 1;
      newName = `Terminal ${nextNum}`;
      newIp = '';
      newPort = 22;
      newUser = 'root';
      newPass = '';
    }
    showAddDialog = true;
  }

  async function handleConnectSubmit() {
    if (!newIp.trim()) {
      addToast('Host IP is required', 'error');
      return;
    }
    if (!newPass) {
      addToast('SSH password is required', 'error');
      return;
    }

    isConnecting = true;
    showAddDialog = false;

    // Check if updating the first empty session or adding a new session
    const current = sessions.find((s) => s.id === activeSessionId);
    let targetSession: TerminalSession;

    if (current && !current.ip) {
      current.name = newName.trim() || current.name;
      current.ip = newIp.trim();
      current.port = newPort || 22;
      current.username = newUser.trim() || 'root';
      current.password = newPass;
      targetSession = current;
    } else {
      const newId = `term-${Date.now()}`;
      targetSession = {
        id: newId,
        name: newName.trim() || `Terminal ${sessions.length + 1}`,
        ip: newIp.trim(),
        port: newPort || 22,
        username: newUser.trim() || 'root',
        password: newPass,
        status: 'disconnected'
      };
      sessions = [...sessions, targetSession];
      activeSessionId = targetSession.id;
    }

    isConnecting = false;
    await tick();

    if (!activeTerminals[targetSession.id] && containerElements[targetSession.id]) {
      mountXterm(targetSession);
    }

    connectSession(targetSession);
    addToast(`Connecting to ${targetSession.name}...`, 'info');
  }

  function closeSession(id: string, ev: MouseEvent) {
    ev.stopPropagation();
    if (sessions.length <= 1) return;

    const termItem = activeTerminals[id];
    if (termItem) {
      termItem.ws?.close();
      termItem.xterm?.dispose();
      delete activeTerminals[id];
    }
    delete containerElements[id];

    sessions = sessions.filter((s) => s.id !== id);
    if (activeSessionId === id) {
      switchTab(sessions[0].id);
    }
  }

  function handleClear() {
    const active = activeTerminals[activeSessionId];
    if (active?.xterm) {
      active.xterm.clear();
      addToast('Terminal cleared', 'info');
    }
  }

  function toggleAutoScroll() {
    autoScroll = !autoScroll;
    if (autoScroll) {
      const active = activeTerminals[activeSessionId];
      if (active?.xterm) {
        active.xterm.scrollToBottom();
      }
      addToast('Auto Scroll enabled', 'info');
    } else {
      addToast('Auto Scroll disabled', 'info');
    }
  }

  function handleConnectHeader() {
    const session = activeSession;
    if (!session) return;
    if (!session.ip) {
      handleOpenAdd(session);
    } else {
      connectSession(session);
    }
  }

  function handleDisconnect() {
    const session = activeSession;
    if (!session) return;
    const active = activeTerminals[activeSessionId];
    active?.ws?.close();
    session.status = 'disconnected';
    addToast(`Disconnected ${session.name}`, 'info');
  }

  function sendQuickCommand() {
    if (!quickCmd.trim()) return;
    const active = activeTerminals[activeSessionId];
    if (active?.ws && active.ws.readyState === WebSocket.OPEN) {
      active.ws.send(quickCmd + '\r');
      quickCmd = '';
    } else {
      addToast('Terminal is not connected. Connect VPS first.', 'warning');
    }
  }

  function handleQuickKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendQuickCommand();
    }
  }
</script>

<div class="terminal-page-root">
  <!-- Top Header with Connect button opposite to Web Terminal title -->
  <div class="terminal-header-row">
    <h1 class="page-title">Web Terminal</h1>

    <div class="header-actions">
      {#if activeSession?.status === 'connected'}
        <button
          type="button"
          class="header-connect-btn is-connected"
          onclick={handleDisconnect}
          title="Disconnect active SSH session"
        >
          <PowerOff size={14} />
          <span>Disconnect</span>
        </button>
      {:else}
        <button
          type="button"
          class="header-connect-btn"
          onclick={handleConnectHeader}
          title="Connect to VPS"
        >
          <Power size={14} />
          <span>Connect</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Two-Column Wireframe Layout -->
  <div class="terminal-layout">
    <!-- LEFT SIDEBAR: List of terminals, + button, and bottom control buttons -->
    <div class="terminal-sidebar">
      <div class="sidebar-top">
        <div class="sessions-list">
          {#each sessions as session (session.id)}
            {@const isActive = activeSessionId === session.id}
            <div
              role="button"
              tabindex="0"
              class="session-btn"
              class:is-active={isActive}
              onclick={() => switchTab(session.id)}
              onkeydown={(e) => { if (e.key === 'Enter') switchTab(session.id); }}
            >
              <div class="session-info">
                <span
                  class="status-dot"
                  class:is-connected={session.status === 'connected'}
                  class:is-connecting={session.status === 'connecting'}
                  title={session.status}
                ></span>
                <span class="session-name" title={session.name}>{session.name}</span>
              </div>

              {#if sessions.length > 1}
                <button
                  type="button"
                  class="session-close-btn"
                  onclick={(e) => closeSession(session.id, e)}
                  title="Close Terminal"
                >
                  <X size={12} />
                </button>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Add terminal button (+) - disabled if already connected -->
        <button
          type="button"
          class="add-session-btn"
          class:is-disabled={isAnyConnected}
          onclick={() => handleOpenAdd()}
          title={isAnyConnected ? 'Disconnect current terminal before creating a new tab' : 'Add Terminal Connection'}
        >
          <Plus size={16} />
        </button>
      </div>

      <!-- Bottom stacked buttons: Auto Scroll & Clear -->
      <div class="sidebar-bottom">
        <button
          type="button"
          class="sidebar-action-btn"
          class:is-active-toggle={autoScroll}
          onclick={toggleAutoScroll}
          title={autoScroll ? 'Auto Scroll: ON (Click to toggle)' : 'Auto Scroll: OFF (Click to toggle)'}
        >
          <ArrowDown size={13} />
          <span>Auto Scroll</span>
          <span class="toggle-status-dot" class:is-on={autoScroll}></span>
        </button>

        <button
          type="button"
          class="sidebar-action-btn"
          onclick={handleClear}
          title="Clear Terminal Output"
        >
          <RefreshCw size={13} />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- RIGHT MAIN PANEL: Terminal canvas and bottom quick command bar -->
    <div class="terminal-main">
      <div class="terminal-canvas-wrapper">
        {#each sessions as session (session.id)}
          <div
            class="terminal-instance-container"
            style="display: {activeSessionId === session.id ? 'block' : 'none'};"
            bind:this={containerElements[session.id]}
          ></div>
        {/each}
      </div>

      <!-- Horizontal bottom bar with command input and send button (well clear of the floating dock) -->
      <div class="terminal-bottom-bar">
        <input
          type="text"
          class="quick-cmd-input"
          placeholder="Type a command or paste script (press Enter to run)..."
          bind:value={quickCmd}
          onkeydown={handleQuickKeyDown}
        />
        <button
          type="button"
          class="quick-cmd-send-btn"
          onclick={sendQuickCommand}
          title="Send to Terminal"
        >
          <Send size={14} />
          <span>Send</span>
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Add/Configure Terminal Dialog -->
{#if showAddDialog}
  <Dialog title="New Terminal Connection" size="md" onclose={() => (showAddDialog = false)}>
    <form onsubmit={(e) => { e.preventDefault(); handleConnectSubmit(); }} class="terminal-form">
      <div class="form-group">
        <label for="term-name">Connection Name</label>
        <input
          id="term-name"
          type="text"
          placeholder="e.g. Terminal 1 or VPS Production"
          bind:value={newName}
          class="dialog-input"
          required
        />
      </div>

      <div class="host-port-row">
        <div class="form-group host-group">
          <label for="term-ip">Host IP</label>
          <input
            id="term-ip"
            type="text"
            placeholder="e.g. 45.13.238.181 or 127.0.0.1"
            bind:value={newIp}
            class="dialog-input"
            required
          />
        </div>

        <div class="form-group port-group">
          <label for="term-port">Port</label>
          <input
            id="term-port"
            type="number"
            bind:value={newPort}
            class="dialog-input"
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label for="term-user">Username</label>
        <input
          id="term-user"
          type="text"
          placeholder="root"
          bind:value={newUser}
          class="dialog-input"
          required
        />
      </div>

      <div class="form-group">
        <label for="term-pass">Password</label>
        <input
          id="term-pass"
          type="password"
          placeholder="Enter SSH password"
          bind:value={newPass}
          class="dialog-input"
          required
        />
      </div>

      <div class="dialog-actions">
        <Button variant="ghost" onclick={() => (showAddDialog = false)} disabled={isConnecting}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
    </form>
  </Dialog>
{/if}

<style>
  .terminal-page-root {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    margin-top: -10px; /* Reduced gap between Topbar and Web Terminal */
    user-select: none;
    font-family: var(--font-sans);
  }

  .terminal-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .page-title {
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.3px;
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-connect-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.35);
    color: #22c55e;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, transform 100ms ease;
  }

  .header-connect-btn:hover {
    background: rgba(34, 197, 94, 0.22);
    border-color: rgba(34, 197, 94, 0.55);
    color: #4ade80;
  }

  .header-connect-btn:active {
    transform: scale(0.98);
  }

  .header-connect-btn.is-connected {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.35);
    color: #f87171;
  }

  .header-connect-btn.is-connected:hover {
    background: rgba(239, 68, 68, 0.22);
    border-color: rgba(239, 68, 68, 0.55);
    color: #fca5a5;
  }

  /* Two column container with ample clearance above bottom floating dock */
  .terminal-layout {
    display: flex;
    gap: 16px;
    height: calc(100vh - 250px);
    min-height: 400px;
    width: 100%;
  }

  /* Left Sidebar (bent black glass) */
  .terminal-sidebar {
    width: 230px;
    min-width: 230px;
    background: linear-gradient(145deg, rgba(16, 20, 27, 0.96) 0%, rgba(9, 11, 16, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    box-shadow: none;
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
  }

  .sidebar-top {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  }

  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .session-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
    outline: none;
  }

  .session-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.16);
    color: #e2e8f0;
  }

  .session-btn.is-active {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.45);
    color: #4ade80;
    font-weight: 600;
  }

  .session-info {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #64748b;
    flex-shrink: 0;
  }

  .status-dot.is-connected {
    background: #22c55e;
  }

  .status-dot.is-connecting {
    background: #f59e0b;
  }

  .session-name {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 2px;
    border-radius: 4px;
    color: #64748b;
    cursor: pointer;
    transition: color 120ms ease, background 120ms ease;
  }

  .session-close-btn:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
  }

  .add-session-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 36px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #94a3b8;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  }

  .add-session-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
  }

  .add-session-btn.is-disabled {
    opacity: 0.38;
    cursor: not-allowed;
    border-style: solid;
  }

  /* Bottom action buttons in sidebar */
  .sidebar-bottom {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 12px;
  }

  .sidebar-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 36px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #cbd5e1;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  }

  .sidebar-action-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  .sidebar-action-btn.is-active-toggle {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.3);
    color: #4ade80;
  }

  .toggle-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #64748b;
    margin-left: 2px;
  }

  .toggle-status-dot.is-on {
    background: #22c55e;
  }

  /* Right Main Panel (bent black glass) */
  .terminal-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: linear-gradient(145deg, rgba(16, 20, 27, 0.96) 0%, rgba(9, 11, 16, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    box-shadow: none;
    overflow: hidden;
  }

  .terminal-canvas-wrapper {
    flex: 1;
    position: relative;
    padding: 10px 14px;
    overflow: hidden;
    background: #0a0d14;
  }

  .terminal-instance-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  /* Bottom command bar positioned comfortably above floating dock */
  .terminal-bottom-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(9, 11, 16, 0.98);
  }

  .quick-cmd-input {
    flex: 1;
    height: 38px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0 12px;
    color: #ffffff;
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    outline: none;
    transition: border-color 150ms ease;
  }

  .quick-cmd-input:focus {
    border-color: #22c55e;
  }

  .quick-cmd-send-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 16px;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.35);
    border-radius: 8px;
    color: #4ade80;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  }

  .quick-cmd-send-btn:hover {
    background: rgba(34, 197, 94, 0.22);
    border-color: rgba(34, 197, 94, 0.55);
    color: #ffffff;
  }

  /* Dialog styling matching Core modal */
  .terminal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 12.5px;
    font-weight: 600;
    color: #cbd5e1;
  }

  .host-port-row {
    display: flex;
    gap: 10px;
  }

  .host-group {
    flex: 2.2;
  }

  .port-group {
    flex: 1;
  }

  .dialog-input {
    width: 100%;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 0 12px;
    color: #ffffff;
    font-size: 13.5px;
    outline: none;
    box-sizing: border-box;
  }

  .dialog-input:focus {
    border-color: #22c55e;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
  }
</style>
