<script lang="ts">
  import { stats } from '$lib/stores/core';
  import { nodeStore } from '$lib/stores/node.svelte';
  import { HardDrive, X, Trash2, Loader2, Sparkles, Box, Zap, FileText, Terminal } from '@lucide/svelte';
  import Progress from '$lib/ui/feedback/Progress.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { post } from '$lib/api/client';
  import { fade, scaleIn } from '$lib/ui/motion/transitions';

  let { onclose }: { onclose: () => void } = $props();

  const nodeName = $derived(nodeStore.activeNode?.name || 'Local Core');
  const dockerImagesSize = $derived($stats?.docker_images_size ?? 0);
  const dockerLogsSize = $derived($stats?.docker_logs_size ?? 0);
  const dockerStorageSize = $derived($stats?.docker_storage_size ?? 0);

  // Sub-dialog states for clean actions
  let activeSubModal = $state<'docker' | 'vps' | null>(null);
  let vacuumDays = $state('3d');
  let runningAction = $state<string | null>(null);

  function formatBytes(bytes: number | undefined): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  // Partitions: filter out [SWAP] and ensure '/' appears first, then other real mounts
  const realPartitions = $derived.by(() => {
    if (!$stats?.partitions || $stats.partitions.length === 0) {
      if ($stats?.disk_total && $stats.disk_total > 0) {
        return [{
          device: 'rootfs',
          mountpoint: '/',
          total: $stats.disk_total,
          used: $stats.disk_used || 0,
          used_percent: $stats.disk_usage || 0
        }];
      }
      return [];
    }

    const filtered = $stats.partitions.filter((p) => p.mountpoint !== '[SWAP]');
    // Sort so '/' is first, then other mounted partitions, then unmounted partitions
    return [...filtered].sort((a, b) => {
      if (a.mountpoint === '/') return -1;
      if (b.mountpoint === '/') return 1;
      return a.mountpoint.localeCompare(b.mountpoint);
    });
  });

  async function runDockerClean(action: string, label: string) {
    runningAction = action;
    try {
      addToast(`Running Docker cleanup: ${label}...`, 'info');
      await post(`/core/docker/clean?action=${action}`, {});
      addToast(`Docker cleanup completed: ${label}`, 'success');
    } catch (err: any) {
      addToast(`Docker clean failed: ${err.message || err}`, 'danger');
    } finally {
      runningAction = null;
    }
  }

  async function runVpsClean(action: string, label: string, extraTime?: string) {
    runningAction = action;
    try {
      addToast(`Running VPS cleanup: ${label}...`, 'info');
      let url = `/core/system/clean?action=${action}`;
      if (extraTime) {
        url += `&time=${encodeURIComponent(extraTime)}`;
      }
      await post(url, {});
      addToast(`VPS cleanup completed: ${label}`, 'success');
    } catch (err: any) {
      addToast(`VPS clean failed: ${err.message || err}`, 'danger');
    } finally {
      runningAction = null;
    }
  }

  async function runLogClean(type: 'hex_core_log' | 'hex_panel_log', label: string) {
    runningAction = type;
    try {
      addToast(`Cleaning ${label}...`, 'info');
      await post(`/core/system/clean?action=${type}`, {});
      addToast(`${label} cleared successfully`, 'success');
    } catch (err: any) {
      addToast(`Failed to clean ${label}: ${err.message || err}`, 'danger');
    } finally {
      runningAction = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (activeSubModal) {
        activeSubModal = null;
      } else {
        onclose();
      }
    }
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
          <HardDrive size={18} class="chip-icon" />
        </div>
        <h3 class="modal-title">Storage Details - {nodeName}</h3>
      </div>
      <button type="button" class="close-btn" onclick={onclose} aria-label="Close dialog">
        <X size={18} />
      </button>
    </div>

    <!-- 2-Column Desktop Layout (stacked on mobile) -->
    <div class="storage-body">
      <!-- LEFT COLUMN: 2x2 Clean Boxes -->
      <div class="left-col">
        <span class="section-label">MAINTENANCE & CLEANUP</span>
        <div class="clean-grid-2x2">
          <!-- Box 1: Docker Clean -->
          <div class="clean-box">
            <div class="clean-box-header">
              <span class="box-icon-wrap docker">
                <Box size={16} />
              </span>
              <span class="box-title">Docker Clean</span>
            </div>
            <div class="clean-box-meta">
              <span class="meta-label">Cache & Images</span>
              <span class="meta-val font-mono">{formatBytes(dockerImagesSize)}</span>
            </div>
            <button
              type="button"
              class="clean-btn"
              onclick={() => activeSubModal = 'docker'}
            >
              <Sparkles size={13} />
              <span>Clean</span>
            </button>
          </div>

          <!-- Box 2: VPS Cleanup -->
          <div class="clean-box">
            <div class="clean-box-header">
              <span class="box-icon-wrap vps">
                <Zap size={16} />
              </span>
              <span class="box-title">VPS Cleanup</span>
            </div>
            <div class="clean-box-meta">
              <span class="meta-label">Packages & Logs</span>
              <span class="meta-val font-mono">{formatBytes(dockerLogsSize)}</span>
            </div>
            <button
              type="button"
              class="clean-btn"
              onclick={() => activeSubModal = 'vps'}
            >
              <Trash2 size={13} />
              <span>Clean</span>
            </button>
          </div>

          <!-- Box 3: Hex Core Logs -->
          <div class="clean-box">
            <div class="clean-box-header">
              <span class="box-icon-wrap purple">
                <FileText size={16} />
              </span>
              <span class="box-title">Hex Core Logs</span>
            </div>
            <div class="clean-box-meta">
              <span class="meta-label">Logs</span>
              <span class="meta-val font-mono">120 MB</span>
            </div>
            <button
              type="button"
              class="clean-btn danger"
              disabled={runningAction === 'hex_core_log'}
              onclick={() => runLogClean('hex_core_log', 'Hex Core Logs')}
            >
              {#if runningAction === 'hex_core_log'}
                <Loader2 size={13} class="spin" />
              {:else}
                <Trash2 size={13} />
              {/if}
              <span>Clean</span>
            </button>
          </div>

          <!-- Box 4: Hex Panel Logs -->
          <div class="clean-box">
            <div class="clean-box-header">
              <span class="box-icon-wrap green">
                <Terminal size={16} />
              </span>
              <span class="box-title">Hex Panel Logs</span>
            </div>
            <div class="clean-box-meta">
              <span class="meta-label">Logs</span>
              <span class="meta-val font-mono">Active</span>
            </div>
            <button
              type="button"
              class="clean-btn danger"
              disabled={runningAction === 'hex_panel_log'}
              onclick={() => runLogClean('hex_panel_log', 'Hex Panel Logs')}
            >
              {#if runningAction === 'hex_panel_log'}
                <Loader2 size={13} class="spin" />
              {:else}
                <Trash2 size={13} />
              {/if}
              <span>Clean</span>
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Partitions & Docker Storage -->
      <div class="right-col">
        <span class="section-label">PARTITIONS & VOLUMES</span>
        <div class="partitions-list">
          <!-- 1st: Docker Storage -->
          <div class="partition-card docker-storage-card">
            <div class="partition-row-top">
              <div class="partition-name-cluster">
                <span class="drive-icon-wrap docker">
                  <Box size={15} />
                </span>
                <span class="partition-name">Docker Storage</span>
              </div>
              <span class="partition-size font-mono">{formatBytes(dockerStorageSize)}</span>
            </div>
            <div class="partition-sub-meta">
              <span>Managed by Docker daemon overlay2</span>
            </div>
          </div>

          <!-- 2nd onward: Normal partitions (rootfs, /boot/efi, etc.) -->
          {#if realPartitions.length > 0}
            {#each realPartitions as p (p.mountpoint)}
              <div class="partition-card">
                <div class="partition-row-top">
                  <div class="partition-name-cluster">
                    <span class="drive-icon-wrap part">
                      <HardDrive size={15} />
                    </span>
                    <span class="partition-name font-mono">{p.mountpoint}</span>
                  </div>
                  <span class="partition-size font-mono">{formatBytes(p.used)} / {formatBytes(p.total)}</span>
                </div>
                <div class="part-bar">
                  <Progress value={p.used_percent} height="thin" />
                </div>
                <div class="partition-sub-meta">
                  <span>Device: {p.device}</span>
                  <span class="font-mono">{p.used_percent ? p.used_percent.toFixed(1) : '0.0'}% Used</span>
                </div>
              </div>
            {/each}
          {:else}
            <div class="empty-partitions">
              <span>Awaiting filesystem mounts telemetry...</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- SUB-MODAL: Docker Clean Options -->
{#if activeSubModal === 'docker'}
  <div class="submodal-backdrop" onclick={() => activeSubModal = null} role="presentation">
    <div
      class="submodal-panel"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <div class="submodal-header">
        <div class="submodal-title">
          <div class="icon-chip-small docker">
            <Box size={15} />
          </div>
          <h4>Docker Clean Options</h4>
        </div>
        <button type="button" class="close-btn" onclick={() => activeSubModal = null}>
          <X size={16} />
        </button>
      </div>

      <div class="submodal-options">
        <div class="action-item">
          <div class="action-desc">
            <span class="action-title">Remove unused build cache</span>
            <code class="action-cmd">docker builder prune -af</code>
          </div>
          <button
            type="button"
            class="action-btn"
            disabled={runningAction === 'builder_prune'}
            onclick={() => runDockerClean('builder_prune', 'Build Cache')}
          >
            {#if runningAction === 'builder_prune'}<Loader2 size={13} class="spin" />{:else}Clean{/if}
          </button>
        </div>

        <div class="action-item">
          <div class="action-desc">
            <span class="action-title">Remove dangling images</span>
            <code class="action-cmd">docker image prune -f</code>
          </div>
          <button
            type="button"
            class="action-btn"
            disabled={runningAction === 'image_prune'}
            onclick={() => runDockerClean('image_prune', 'Dangling Images')}
          >
            {#if runningAction === 'image_prune'}<Loader2 size={13} class="spin" />{:else}Clean{/if}
          </button>
        </div>

        <div class="action-item">
          <div class="action-desc">
            <span class="action-title">Remove unused networks</span>
            <code class="action-cmd">docker network prune -f</code>
          </div>
          <button
            type="button"
            class="action-btn"
            disabled={runningAction === 'network_prune'}
            onclick={() => runDockerClean('network_prune', 'Unused Networks')}
          >
            {#if runningAction === 'network_prune'}<Loader2 size={13} class="spin" />{:else}Clean{/if}
          </button>
        </div>

        <div class="action-item">
          <div class="action-desc">
            <span class="action-title">Removes all unused Docker build cache</span>
            <code class="action-cmd">docker builder prune -a -f</code>
          </div>
          <button
            type="button"
            class="action-btn danger"
            disabled={runningAction === 'builder_prune_all'}
            onclick={() => runDockerClean('builder_prune_all', 'All Build Cache')}
          >
            {#if runningAction === 'builder_prune_all'}<Loader2 size={13} class="spin" />{:else}Clean All{/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- SUB-MODAL: VPS Cleanup Options -->
{#if activeSubModal === 'vps'}
  <div class="submodal-backdrop" onclick={() => activeSubModal = null} role="presentation">
    <div
      class="submodal-panel"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <div class="submodal-header">
        <div class="submodal-title">
          <div class="icon-chip-small vps">
            <Zap size={15} />
          </div>
          <h4>VPS Cleanup Options</h4>
        </div>
        <button type="button" class="close-btn" onclick={() => activeSubModal = null}>
          <X size={16} />
        </button>
      </div>

      <div class="submodal-options">
        <div class="action-item">
          <div class="action-desc">
            <span class="action-title">Clean APT cache</span>
            <code class="action-cmd">sudo apt clean</code>
          </div>
          <button
            type="button"
            class="action-btn"
            disabled={runningAction === 'apt_clean'}
            onclick={() => runVpsClean('apt_clean', 'APT Cache')}
          >
            {#if runningAction === 'apt_clean'}<Loader2 size={13} class="spin" />{:else}Clean{/if}
          </button>
        </div>

        <div class="action-item">
          <div class="action-desc">
            <span class="action-title">Remove obsolete package dependencies</span>
            <code class="action-cmd">sudo apt autoremove -y</code>
          </div>
          <button
            type="button"
            class="action-btn"
            disabled={runningAction === 'apt_autoremove'}
            onclick={() => runVpsClean('apt_autoremove', 'Autoremove')}
          >
            {#if runningAction === 'apt_autoremove'}<Loader2 size={13} class="spin" />{:else}Clean{/if}
          </button>
        </div>

        <div class="action-item">
          <div class="action-desc">
            <span class="action-title">Clean old system logs</span>
            <code class="action-cmd">sudo journalctl --vacuum-time={vacuumDays}</code>
            <div class="days-input-row">
              <label for="vacDays" class="text-xs text-muted">Vacuum Time:</label>
              <input
                id="vacDays"
                type="text"
                class="days-input font-mono"
                bind:value={vacuumDays}
                placeholder="3d"
              />
            </div>
          </div>
          <button
            type="button"
            class="action-btn"
            disabled={runningAction === 'journal_vacuum'}
            onclick={() => runVpsClean('journal_vacuum', 'Journal Logs', vacuumDays)}
          >
            {#if runningAction === 'journal_vacuum'}<Loader2 size={13} class="spin" />{:else}Clean{/if}
          </button>
        </div>

        <div class="action-item">
          <div class="action-desc">
            <span class="action-title">Clean downloaded package files</span>
            <code class="action-cmd">sudo apt autoclean</code>
          </div>
          <button
            type="button"
            class="action-btn"
            disabled={runningAction === 'apt_autoclean'}
            onclick={() => runVpsClean('apt_autoclean', 'APT Autoclean')}
          >
            {#if runningAction === 'apt_autoclean'}<Loader2 size={13} class="spin" />{:else}Clean{/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

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
    max-width: 920px;
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

  .storage-body {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 24px;
    padding: 20px 24px;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .storage-body {
      grid-template-columns: 1fr;
    }
  }

  .section-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .clean-grid-2x2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .clean-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: var(--radius-lg);
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 10px;
    transition: all var(--transition-fast);
  }

  .clean-box:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .clean-box-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .box-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
  }

  .box-icon-wrap.docker {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.25);
  }

  .box-icon-wrap.vps {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(251, 191, 36, 0.25);
  }

  .box-icon-wrap.purple {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.25);
  }

  .box-icon-wrap.green {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.25);
  }

  .box-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .clean-box-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 12px;
  }

  .meta-label {
    color: var(--text-muted);
  }

  .meta-val {
    color: var(--text-secondary);
    font-weight: 600;
  }

  .clean-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 7px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    border-radius: var(--radius-sm);
    background: rgba(239, 68, 68, 0.12);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .clean-btn:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.22);
    border-color: rgba(239, 68, 68, 0.45);
    color: #fca5a5;
  }

  .clean-btn.danger {
    background: rgba(239, 68, 68, 0.12);
    color: #f87171;
  }

  .clean-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .partitions-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .partition-card {
    background: rgba(0, 0, 0, 0.24);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .partition-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .partition-name-cluster {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .drive-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: var(--radius-xs);
  }

  .drive-icon-wrap.docker {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.1);
  }

  .drive-icon-wrap.part {
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.06);
  }

  .partition-name {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .partition-size {
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  .part-bar {
    width: 100%;
    padding: 2px 0;
  }

  .partition-sub-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-muted);
  }

  .empty-partitions {
    padding: 20px;
    text-align: center;
    font-size: 12.5px;
    color: var(--text-muted);
  }

  /* SUB-MODAL STYLES */
  .submodal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 4, 8, 0.7);
    backdrop-filter: blur(6px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    padding-bottom: 76px;
  }

  .submodal-panel {
    background: rgba(16, 20, 28, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.85);
    width: 100%;
    max-width: 500px;
    overflow: hidden;
  }

  .submodal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .submodal-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon-chip-small {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-xs);
  }

  .icon-chip-small.docker {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
  }

  .icon-chip-small.vps {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }

  .submodal-title h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .submodal-options {
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .action-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-md);
  }

  .action-desc {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  .action-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .action-cmd {
    font-size: 10.5px;
    color: #4ade80;
    font-family: var(--font-mono);
  }

  .days-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .days-input {
    width: 60px;
    padding: 2px 6px;
    font-size: 11px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    color: var(--text-primary);
  }

  .action-btn {
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.25);
    color: #86efac;
  }

  .action-btn.danger {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .action-btn.danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>