<script lang="ts">
  import PageHeader from '$lib/ui/layout/PageHeader.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import { onMount } from 'svelte';
  import { Plus, X, Terminal as TerminalIcon, RefreshCw } from '@lucide/svelte';

  interface Tab {
    id: string;
    title: string;
  }

  let tabs = $state<Tab[]>([{ id: 'term-1', title: 'Terminal 1' }]);
  let activeTabId = $state('term-1');
  let terminalElement: HTMLDivElement | null = null;
  let xterm: any = null;
  let fitAddon: any = null;

  onMount(async () => {
    try {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');
      await import('@xterm/xterm/css/xterm.css');

      if (terminalElement) {
        xterm = new Terminal({
          cursorBlink: true,
          cursorStyle: 'block',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          theme: {
            background: '#0a0a0f',
            foreground: '#f0f0f0',
            cursor: '#00ff88',
            selectionBackground: 'rgba(0, 255, 136, 0.3)',
            black: '#141418',
            red: '#ff4d4d',
            green: '#00ff88',
            yellow: '#f5c518',
            blue: '#4d9fff',
            magenta: '#a855f7',
            cyan: '#06b6d4',
            white: '#f0f0f0'
          }
        });

        fitAddon = new FitAddon();
        xterm.loadAddon(fitAddon);
        xterm.loadAddon(new WebLinksAddon());

        xterm.open(terminalElement);
        fitAddon.fit();

        // Connect to real WebSocket terminal stream via node proxy
        let termSocket: WebSocket | null = null;

        function connectTerminalWS() {
          const proto = location.protocol === 'https:' ? 'wss' : 'ws';
          const wsUrl = `${proto}://${location.host}/api/v1/ws?type=terminal&session=${activeTabId}`;
          try {
            termSocket = new WebSocket(wsUrl);
            termSocket.onopen = () => {
              xterm?.writeln('\x1b[1;32m[Connected to VPS Core PTY via Hex Node Proxy]\x1b[0m\r\n');
            };
            termSocket.onmessage = (ev) => {
              xterm?.write(typeof ev.data === 'string' ? ev.data : new Uint8Array(ev.data));
            };
            termSocket.onclose = () => {
              xterm?.writeln('\r\n\x1b[33m[VPS Core Terminal stream closed. Connect a live Core in Core Management.]\x1b[0m\r\n');
            };
            termSocket.onerror = () => {
              termSocket?.close();
            };
          } catch {}
        }

        connectTerminalWS();

        xterm.onData((data: string) => {
          if (termSocket && termSocket.readyState === WebSocket.OPEN) {
            termSocket.send(data);
          }
        });

        window.addEventListener('resize', () => fitAddon?.fit());
      }
    } catch {
      // fallback
    }

    return () => {
      if (xterm) xterm.dispose();
    };
  });

  function addTab() {
    const num = tabs.length + 1;
    const newTab = { id: `term-${num}`, title: `Terminal ${num}` };
    tabs = [...tabs, newTab];
    activeTabId = newTab.id;
  }

  function closeTab(id: string) {
    if (tabs.length === 1) return;
    tabs = tabs.filter((t) => t.id !== id);
    if (activeTabId === id) {
      activeTabId = tabs[0].id;
    }
  }
</script>

<div class="terminal-page">
  <PageHeader title="Web Terminal" description="Direct interactive PTY shell access to host node">
    {#snippet actions()}
      <Button variant="secondary" icon={RefreshCw} onclick={() => xterm?.clear()}>
        Clear Buffer
      </Button>
    {/snippet}
  </PageHeader>

  <div class="terminal-box">
    <!-- Tabs Bar -->
    <div class="tabs-header">
      <div class="tabs-list">
        {#each tabs as tab}
          <div
            role="tab"
            tabindex="0"
            onkeydown={(e) => { if (e.key === "Enter") activeTabId = tab.id; }}
            class="tab-item"
            class:is-active={activeTabId === tab.id}
            onclick={() => (activeTabId = tab.id)}
          >
            <TerminalIcon size={14} class="tab-icon" />
            <span class="tab-name">{tab.title}</span>
            {#if tabs.length > 1}
              <button
                class="tab-close"
                onclick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                aria-label="Close tab"
              >
                <X size={12} />
              </button>
            {/if}
          </div>
        {/each}
      </div>

      <button class="add-tab-btn" onclick={addTab} aria-label="Add terminal">
        <Plus size={16} />
      </button>
    </div>

    <!-- Terminal Canvas Wrapper -->
    <div class="xterm-container" bind:this={terminalElement}></div>
  </div>
</div>

<style>
  .terminal-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    height: 100%;
  }

  .terminal-box {
    background: #0a0a0f;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: calc(100vh - 220px);
    box-shadow: var(--shadow-card);
  }

  .tabs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    padding: 0 var(--space-2);
    height: 38px;
  }

  .tabs-list {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    height: 100%;
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--text-secondary);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all var(--transition-fast);
  }

  .tab-item:hover {
    color: var(--text-primary);
  }

  .tab-item.is-active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    background: rgba(0, 255, 136, 0.05);
  }

  

  .tab-close {
    display: flex;
    align-items: center;
    padding: 2px;
    border-radius: 50%;
    color: var(--text-muted);
  }

  .tab-close:hover {
    color: var(--text-primary);
  }

  .add-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
  }

  .add-tab-btn:hover {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }

  .xterm-container {
    flex: 1;
    width: 100%;
    padding: 8px 12px;
    overflow: hidden;
  }
</style>
