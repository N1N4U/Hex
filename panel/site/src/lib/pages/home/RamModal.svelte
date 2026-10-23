<script lang="ts">
  import { stats } from '$lib/stores/core';
  import { nodeStore } from '$lib/stores/node.svelte';
  import { Cpu, X, Terminal, Box } from '@lucide/svelte';
  import { fade, scaleIn } from '$lib/ui/motion/transitions';

  let { onclose }: { onclose: () => void } = $props();

  const nodeName = $derived(nodeStore.activeNode?.name || 'Local Core');
  const usedRam = $derived($stats?.mem_used ?? 0);
  const totalRam = $derived($stats?.mem_total ?? 1);
  const swapUsed = $derived($stats?.swap_used ?? 0);
  const swapTotal = $derived($stats?.swap_total ?? 0);

  const processes = $derived($stats?.top_processes ?? []);

  // Sort by RAM descending
  const sortedProcesses = $derived.by(() => {
    return [...processes].sort((a, b) => (b.memory_bytes || 0) - (a.memory_bytes || 0));
  });

  function formatBytes(bytes: number | undefined): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }

  function isDockerProc(name: string): boolean {
    const n = name.toLowerCase();
    return n.includes('docker') || n.includes('container') || n.includes('shim') || n.includes('wings');
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
    tabindex="-1"
  >
    <!-- Modal Header -->
    <div class="modal-header">
      <div class="title-cluster">
        <div class="icon-chip">
          <Cpu size={18} class="chip-icon" />
        </div>
        <h3 class="modal-title">Top Processes by RAM Usage - {nodeName}</h3>
      </div>
      <button type="button" class="close-btn" onclick={onclose} aria-label="Close dialog">
        <X size={18} />
      </button>
    </div>

    <!-- Metrics Bar: RAM on left, SWAP on right as requested -->
    <div class="metrics-bar">
      <div class="metric-block">
        <span class="metric-label">RAM USAGE</span>
        <div class="metric-vals">
          <span class="main-val">{formatBytes(usedRam)}</span>
          <span class="total-val">/ {formatBytes(totalRam)}</span>
        </div>
      </div>
      <div class="metric-block text-right">
        <span class="metric-label">SWAP</span>
        <div class="metric-vals">
          <span class="main-val">{formatBytes(swapUsed)}</span>
          <span class="total-val">/ {formatBytes(swapTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Table Header (TIME+) -->
    <div class="table-header">
      <span class="col-pid">PID</span>
      <span class="col-name">NAME</span>
      <span class="col-user">USER</span>
      <span class="col-time">TIME+</span>
      <span class="col-pct">RAM %</span>
      <span class="col-swap-pct">SWAP %</span>
      <span class="col-swap-val">SWAP</span>
      <span class="col-ram-val">RAM</span>
    </div>

    <!-- Process Rows List -->
    <div class="process-scroll">
      {#if sortedProcesses.length > 0}
        {#each sortedProcesses as proc (proc.pid)}
          {@const ramPct = totalRam > 0 ? ((proc.memory_bytes || 0) / totalRam) * 100 : 0}
          {@const swapPct = swapTotal > 0 ? ((proc.swap_bytes || 0) / swapTotal) * 100 : 0}
          <div class="process-row">
            <span class="col-pid text-muted font-mono">{proc.pid}</span>
            <div class="col-name">
              {#if isDockerProc(proc.name)}
                <span class="proc-icon docker" title="Docker / Container">
                  <Box size={14} class="docker-icon" />
                </span>
              {:else}
                <span class="proc-icon term">
                  <Terminal size={14} />
                </span>
              {/if}
              <span class="proc-text" title={proc.name}>{proc.name}</span>
            </div>
            <span class="col-user text-secondary truncate">{proc.user || 'root'}</span>
            <span class="col-time font-mono text-muted">{proc.uptime || proc.time_plus || '0s'}</span>
            <span class="col-pct font-mono text-secondary">{ramPct.toFixed(1)}%</span>
            <span class="col-swap-pct font-mono text-muted">{swapPct > 0 ? swapPct.toFixed(1) + '%' : '0%'}</span>
            <span class="col-swap-val font-mono text-muted truncate">{formatBytes(proc.swap_bytes)}</span>
            <span class="col-ram-val font-mono text-green truncate">{formatBytes(proc.memory_bytes)}</span>
          </div>
        {/each}
      {:else}
        <div class="empty-state">
          <span>Awaiting process telemetry from connected VPS Core...</span>
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
    padding-bottom: 76px; /* Stop above mac dock */
  }

  .modal-panel {
    background: rgba(13, 17, 24, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-xl);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    width: 100%;
    max-width: 840px;
    max-height: calc(100vh - 120px); /* Clear bottom dock */
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

  .metrics-bar {
    padding: 16px 24px;
    background: rgba(0, 0, 0, 0.22);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .metric-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metric-block.text-right {
    align-items: flex-end;
    text-align: right;
  }

  .metric-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .metric-vals {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-family: var(--font-mono);
  }

  .main-val {
    font-size: 19px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .total-val {
    font-size: 12px;
    color: var(--text-muted);
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

  .col-pid { width: 65px; flex-shrink: 0; font-size: 12px; }
  .col-name { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .col-user { width: 100px; flex-shrink: 0; font-size: 12px; }
  .col-time { width: 90px; flex-shrink: 0; font-size: 12px; }
  .col-pct { width: 70px; flex-shrink: 0; text-align: right; }
  .col-swap-pct { width: 70px; flex-shrink: 0; text-align: right; }
  .col-swap-val { width: 90px; flex-shrink: 0; text-align: right; }
  .col-ram-val { width: 90px; flex-shrink: 0; text-align: right; font-weight: 600; }

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

  :global(.docker-icon) {
    color: #38bdf8;
  }

  .proc-text {
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .text-green { color: #4ade80; }

  .empty-state {
    padding: 32px 24px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
</style>