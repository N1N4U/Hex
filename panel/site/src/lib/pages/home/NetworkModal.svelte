<script lang="ts">
  import { stats } from '$lib/stores/core';
  import { nodeStore } from '$lib/stores/node.svelte';
  import { Globe, Terminal, X, ArrowDown, ArrowUp, ArrowUpDown, Info, Box } from '@lucide/svelte';
  import { fade, scaleIn } from '$lib/ui/motion/transitions';

  let { onclose }: { onclose: () => void } = $props();

  const nodeName = $derived(nodeStore.activeNode?.name || 'Local Core');
  const netRecvTotal = $derived($stats?.net_total_recv ?? 0);
  const netSentTotal = $derived($stats?.net_total_sent ?? 0);
  const netTotalTransfer = $derived(netRecvTotal + netSentTotal);
  const currentDownRate = $derived($stats?.net_recv ?? 0);
  const currentUpRate = $derived($stats?.net_sent ?? 0);

  function formatBytes(bytes: number | undefined): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatSpeed(bytes: number | undefined): string {
    if (!bytes || bytes <= 0) return '0 B/s';
    if (bytes < 1024) return bytes + ' B/s';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB/s';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB/s';
  }

  const sortedProcesses = $derived.by(() => {
    if (!$stats?.top_processes) return [];
    return [...$stats.top_processes].sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0));
  });

  function isDockerProc(name: string): boolean {
    return name.includes('docker') || name.includes('containerd');
  }

  function getNetStatus(name: string) {
    const n = name.toLowerCase();
    if (n.includes('docker') || n.includes('containerd')) {
      return { type: 'bridge', badge: 'Docker Net', detail: 'veth / bridge' };
    }
    if (n.includes('node') || n.includes('python') || n.includes('java') || n.includes('next') || n.includes('mariadb') || n.includes('wings') || n.includes('hex')) {
      return { type: 'socket', badge: 'TCP / UDP', detail: 'Listening / IO' };
    }
    return { type: 'host', badge: 'Host Net', detail: 'Kernel Socket' };
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="modal-backdrop"
  onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
  transition:fade={{ duration: 150 }}
  role="presentation"
>
  <div
    class="modal-panel"
    transition:scaleIn={{ duration: 200, start: 0.96 }}
    role="dialog"
    aria-modal="true"
  >
    <!-- Modal Header -->
    <div class="modal-header">
      <div class="title-cluster">
        <div class="icon-chip">
          <Globe size={18} class="chip-icon" />
        </div>
        <h3 class="modal-title">Network Details - {nodeName}</h3>
      </div>
      <button type="button" class="close-btn" onclick={onclose} aria-label="Close dialog">
        <X size={18} />
      </button>
    </div>

    <!-- Top 3 Metric Cards -->
    <div class="metric-cards-grid">
      <!-- Total Download -->
      <div class="net-card down">
        <div class="net-card-icon green">
          <ArrowDown size={22} />
        </div>
        <div class="net-card-info">
          <span class="net-card-label">TOTAL DOWNLOAD</span>
          <span class="net-card-val text-green font-mono">{formatBytes(netRecvTotal)}</span>
          <span class="net-card-sub font-mono">Live: {formatSpeed(currentDownRate)}</span>
        </div>
      </div>

      <!-- Total Upload -->
      <div class="net-card up">
        <div class="net-card-icon amber">
          <ArrowUp size={22} />
        </div>
        <div class="net-card-info">
          <span class="net-card-label">TOTAL UPLOAD</span>
          <span class="net-card-val text-amber font-mono">{formatBytes(netSentTotal)}</span>
          <span class="net-card-sub font-mono">Live: {formatSpeed(currentUpRate)}</span>
        </div>
      </div>

      <!-- Total Transfer -->
      <div class="net-card total">
        <div class="net-card-icon purple">
          <ArrowUpDown size={22} />
        </div>
        <div class="net-card-info">
          <span class="net-card-label">TOTAL TRANSFER</span>
          <span class="net-card-val text-purple font-mono">{formatBytes(netTotalTransfer)}</span>
          <span class="net-card-sub font-mono">Total VPS Traffic</span>
        </div>
      </div>
    </div>

    <!-- Notice explaining network stack -->
    <div class="telemetry-note">
      <Info size={14} class="note-icon" />
      <span>Total VPS socket traffic is tracked above. Process network activity details socket bindings, bridge interfaces, and virtual namespaces.</span>
    </div>

    <!-- Table Header (TIME+) -->
    <div class="table-header">
      <span class="col-pid">PID</span>
      <span class="col-name">NAME</span>
      <span class="col-user">USER</span>
      <span class="col-time">TIME+</span>
      <span class="col-act">NETWORK STATUS</span>
    </div>

    <!-- Process Rows List -->
    <div class="process-scroll">
      {#if sortedProcesses.length > 0}
        {#each sortedProcesses as proc (proc.pid)}
          {@const netInfo = getNetStatus(proc.name)}
          <div class="process-row">
            <span class="col-pid text-muted font-mono">{proc.pid}</span>
            <div class="col-name">
              {#if isDockerProc(proc.name)}
                <span class="proc-icon docker" title="Docker / Container">
                  <Box size={14} />
                </span>
              {:else}
                <span class="proc-icon term">
                  <Terminal size={14} />
                </span>
              {/if}
              <span class="proc-text" title={proc.name}>{proc.name}</span>
            </div>
            <span class="col-user text-secondary truncate">{proc.user || 'root'}</span>
            <span class="col-time font-mono text-muted">{proc.uptime || proc.time_plus || '0:00.00'}</span>
            <div class="col-act font-mono">
              <span class="net-badge {netInfo.type}">{netInfo.badge}</span>
              <span class="act-stats text-muted">{netInfo.detail}</span>
            </div>
          </div>
        {/each}
      {:else}
        <div class="empty-state">
          <span>Awaiting network process telemetry...</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 6, 10, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    padding-bottom: 76px; /* Mac dock clearance */
  }

  .modal-panel {
    background: rgba(13, 17, 24, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-xl);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    width: 100%;
    max-width: 800px;
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px 14px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .title-cluster {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-chip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.25);
    color: #4ade80;
  }

  .modal-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.2px;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    border: none;
    padding: 6px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .close-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .metric-cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 14px;
    padding: 18px 24px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  @media (max-width: 680px) {
    .metric-cards-grid {
      grid-template-columns: 1fr;
    }
  }

  .net-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-lg);
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .net-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: var(--radius-md);
    flex-shrink: 0;
  }

  .net-card-icon.green {
    background: rgba(34, 197, 94, 0.12);
    color: #4ade80;
  }

  .net-card-icon.amber {
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
  }

  .net-card-icon.purple {
    background: rgba(168, 85, 247, 0.12);
    color: #c084fc;
  }

  .net-card-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .net-card-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .net-card-val {
    font-size: 19px;
    font-weight: 700;
  }

  .net-card-sub {
    font-size: 11px;
    color: var(--text-muted);
  }

  .text-green { color: #4ade80; }
  .text-amber { color: #fbbf24; }
  .text-purple { color: #c084fc; }

  .telemetry-note {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 24px;
    background: rgba(59, 130, 246, 0.06);
    border-bottom: 1px solid rgba(59, 130, 246, 0.15);
    font-size: 11.5px;
    color: #93c5fd;
    line-height: 1.4;
  }

  .table-header {
    display: flex;
    align-items: center;
    padding: 10px 24px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.8px;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(10, 14, 20, 0.4);
  }

  .process-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .process-row {
    display: flex;
    align-items: center;
    padding: 10px 24px;
    font-size: 13px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    transition: background var(--transition-fast);
  }

  .process-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .col-pid { width: 70px; flex-shrink: 0; font-size: 12px; }
  .col-name { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .col-user { width: 110px; flex-shrink: 0; font-size: 12px; }
  .col-time { width: 100px; flex-shrink: 0; font-size: 12px; }
  .col-act { width: 220px; flex-shrink: 0; display: flex; align-items: center; gap: 8px; justify-content: flex-end; }

  .net-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 4px;
  }

  .net-badge.bridge {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .net-badge.socket {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .net-badge.host {
    background: rgba(148, 163, 184, 0.15);
    color: #cbd5e1;
    border: 1px solid rgba(148, 163, 184, 0.25);
  }

  .act-stats {
    font-size: 11px;
  }

  .proc-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .proc-icon.term {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.12);
    border-radius: 4px;
    padding: 2px;
  }

  .proc-icon.docker {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.12);
    border-radius: 4px;
    padding: 2px;
  }

  .proc-text {
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty-state {
    padding: 36px 24px;
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>