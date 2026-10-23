<script lang="ts">
  import { DownloadCloud, X, Terminal, Loader2, RefreshCw, CheckCircle2, Zap, Server } from '@lucide/svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { post } from '$lib/api/client';
  import { fade, scaleIn } from '$lib/ui/motion/transitions';

  let { onclose }: { onclose: () => void } = $props();

  let isUpdatingHex = $state(false);
  let isUpdatingVps = $state(false);
  let hexSuccess = $state(false);
  let vpsSuccess = $state(false);
  let vpsOutput = $state('');

  async function handleHexUpdate() {
    isUpdatingHex = true;
    hexSuccess = false;
    try {
      addToast('Initiating Hex Core VPS update...', 'info');
      await post('/core/system/update?target=hex', {}, 15000);
      hexSuccess = true;
      addToast('Hex update command triggered on VPS Core', 'success');
    } catch (err: any) {
      addToast(`Hex update failed: ${err.message || err}`, 'danger');
    } finally {
      isUpdatingHex = false;
    }
  }

  async function handleVpsUpdate() {
    isUpdatingVps = true;
    vpsSuccess = false;
    vpsOutput = '';
    try {
      addToast('Executing system apt-get update & upgrade on VPS...', 'info');
      const res = await post<any>('/core/system/update?target=vps', {}, 30000);
      vpsSuccess = true;
      if (res?.output) {
        vpsOutput = String(res.output);
      } else if (typeof res === 'string') {
        vpsOutput = res;
      }
      addToast('VPS system upgrade initiated on Linux host', 'success');
    } catch (err: any) {
      addToast(`VPS update failed: ${err.message || err}`, 'danger');
    } finally {
      isUpdatingVps = false;
    }
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
    tabindex="-1"
  >
    <!-- Header -->
    <div class="modal-header">
      <div class="title-cluster">
        <div class="icon-chip">
          <DownloadCloud size={18} class="chip-icon" />
        </div>
        <h3 class="modal-title">System & Core Updates</h3>
      </div>
      <button type="button" class="close-btn" onclick={onclose} aria-label="Close dialog">
        <X size={18} />
      </button>
    </div>

    <!-- Options Body -->
    <div class="modal-body">
      <!-- Option 1: Hex Update -->
      <div class="update-card hex-card">
        <div class="card-icon-col">
          <div class="lucide-avatar hex-avatar">
            <Zap size={22} class="text-amber" />
          </div>
        </div>
        <div class="card-content">
          <div class="card-title-row">
            <h4 class="card-title">Hex Update</h4>
            <span class="badge hex">Recommended</span>
          </div>
          <p class="card-desc">
            Updates Hex Core and background management services directly on your Linux VPS node.
          </p>
          <code class="cmd-preview">hex update</code>
          {#if hexSuccess}
            <div class="success-row">
              <CheckCircle2 size={14} class="text-green" />
              <span>Update sequence triggered. Service restarting...</span>
            </div>
          {/if}
        </div>
        <div class="card-action">
          <button
            type="button"
            class="update-btn hex-btn"
            disabled={isUpdatingHex}
            onclick={handleHexUpdate}
          >
            {#if isUpdatingHex}
              <Loader2 size={14} class="spin" />
              <span>Updating...</span>
            {:else}
              <RefreshCw size={14} />
              <span>Update Hex</span>
            {/if}
          </button>
        </div>
      </div>

      <!-- Option 2: VPS Update -->
      <div class="update-card vps-card">
        <div class="card-icon-col">
          <div class="lucide-avatar vps-avatar">
            <Server size={22} class="text-blue" />
          </div>
        </div>
        <div class="card-content">
          <div class="card-title-row">
            <h4 class="card-title">VPS System Update</h4>
            <span class="badge vps">System Packages</span>
          </div>
          <p class="card-desc">
            Synchronizes package lists and updates system APT repositories across your Linux host.
          </p>
          <code class="cmd-preview">sudo apt-get update && apt-get upgrade -y</code>
          {#if vpsSuccess}
            <div class="success-row">
              <CheckCircle2 size={14} class="text-green" />
              <span>Package upgrade process started on VPS host.</span>
            </div>
          {/if}
          {#if vpsOutput}
            <pre class="output-preview">{vpsOutput.slice(0, 300)}...</pre>
          {/if}
        </div>
        <div class="card-action">
          <button
            type="button"
            class="update-btn vps-btn"
            disabled={isUpdatingVps}
            onclick={handleVpsUpdate}
          >
            {#if isUpdatingVps}
              <Loader2 size={14} class="spin" />
              <span>Updating...</span>
            {:else}
              <Terminal size={14} />
              <span>VPS Update</span>
            {/if}
          </button>
        </div>
      </div>
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
  }

  .modal-panel {
    background: rgba(13, 17, 24, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-xl);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    width: 100%;
    max-width: 620px;
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

  .modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .update-card {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 18px 20px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }

  .update-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .lucide-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
  }

  .hex-avatar {
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.24);
  }

  .vps-avatar {
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.24);
  }

  .text-amber { color: #f59e0b; }
  .text-blue { color: #3b82f6; }

  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .badge {
    font-size: 11px;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    font-weight: 600;
  }

  .badge.hex {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .badge.vps {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .card-desc {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
    margin: 0;
  }

  .cmd-preview {
    font-size: 12px;
    font-family: var(--font-mono);
    color: #4ade80;
    background: rgba(0, 0, 0, 0.35);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    display: inline-block;
    align-self: flex-start;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .success-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #4ade80;
    margin-top: 4px;
  }

  .text-green { color: #4ade80; }

  .output-preview {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    background: rgba(0, 0, 0, 0.4);
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    margin: 4px 0 0 0;
    max-height: 80px;
    overflow-y: auto;
  }

  .card-action {
    display: flex;
    align-items: center;
  }

  .update-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .update-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .hex-btn {
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.35);
    color: #4ade80;
  }

  .hex-btn:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.25);
    border-color: rgba(34, 197, 94, 0.5);
  }

  .vps-btn {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.35);
    color: #60a5fa;
  }

  .vps-btn:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.5);
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
