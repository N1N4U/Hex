<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Dialog from '$lib/ui/overlay/Dialog.svelte';
  import UpdateModal from './UpdateModal.svelte';
  import { stats, wsStatus, pingStore } from '$lib/stores/core';
  import { nodeStore } from '$lib/stores/node.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { post } from '$lib/api/client';
  import { onMount } from 'svelte';
  import {
    RotateCw,
    DownloadCloud,
    FileText,
    Power,
    Eye,
    EyeOff,
    Server,
    Cpu,
    MapPin,
    Layers,
    AlertTriangle
  } from '@lucide/svelte';

  let currentTime = $state('');
  let currentDate = $state('');
  let showIp = $state(false);
  let showUpdateModal = $state(false);

  // Confirmation dialog states
  let confirmAction = $state<'reboot' | 'shutdown' | null>(null);

  onMount(() => {
    const updateTime = () => {
      const now = new Date();
      currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      currentDate = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  });

  function formatUptime(secondsVal: number | string | undefined): string {
    if (!secondsVal) return '-';
    if (typeof secondsVal === 'string') return secondsVal;
    const s = Math.floor(secondsVal);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  const uptime = $derived(formatUptime($stats?.uptime));
  const osName = $derived($stats?.os_name || 'Linux');
  const cpuModel = $derived($stats?.cpu_model || 'Virtual CPU');
  const ipAddress = $derived($stats?.host_ip || nodeStore.activeNode?.ip_address || '45.13.238.181');
  const maskedIp = $derived(showIp ? ipAddress : (ipAddress ? '••••••••••••' : '--'));

  let locationStr = $state('Kassel, Germany');

  $effect(() => {
    if ($stats?.location && $stats.location !== 'Remote VPS' && $stats.location !== 'Local VPS Node') {
      locationStr = $stats.location;
      return;
    }
    const ip = ipAddress;
    const targetUrl = (ip && !ip.startsWith('127.') && ip !== 'localhost' && !ip.startsWith('192.168.'))
      ? `https://ipwho.is/${ip}`
      : 'https://ipwho.is/';

    fetch(targetUrl)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.city && data.country) {
          locationStr = `${data.city}, ${data.country}`;
        }
      })
      .catch(() => {
        locationStr = 'Kassel, Germany';
      });
  });

  function triggerAction(action: 'reboot' | 'shutdown' | 'update' | 'logs') {
    if (action === 'reboot' || action === 'shutdown') {
      confirmAction = action;
    } else if (action === 'update') {
      showUpdateModal = true;
    } else if (action === 'logs') {
      addToast('Opening system logs console...', 'info');
    }
  }

  async function executeConfirmAction() {
    if (!confirmAction) return;
    const act = confirmAction;
    confirmAction = null;

    try {
      if (act === 'reboot') {
        addToast('Sending reboot command to host...', 'warning');
        await post('/core/system/reboot', {});
        addToast('System is rebooting. Connection will resume shortly.', 'info');
      } else if (act === 'shutdown') {
        addToast('Sending shutdown command to host...', 'danger');
        await post('/core/system/shutdown', {});
        addToast('System shutdown initiated.', 'info');
      }
    } catch (err: any) {
      addToast(`Action failed: ${err.message || err}`, 'danger');
    }
  }
</script>

<Card label="SERVER">
  <div class="server-content">
    <!-- Real-time Clock Display (Enlarged) -->
    <div class="clock-display">
      <div class="time-text font-mono">{currentTime || '--:--'}</div>
      <div class="date-text">{currentDate || 'Loading system date...'}</div>
    </div>

    <!-- Node Vital Metadata Grid -->
    <div class="meta-card">
      <div class="meta-row">
        <div class="meta-label">
          <span class="status-indicator online"></span>
          <span>Uptime</span>
        </div>
        <span class="meta-value font-mono">{uptime}</span>
      </div>

      <div class="meta-row">
        <div class="meta-label">
          <Server size={14} class="meta-icon" />
          <span>Host IP</span>
        </div>
        <div class="ip-value-group">
          <span class="meta-value font-mono">{maskedIp}</span>
          <button 
            type="button" 
            class="eye-btn" 
            onclick={() => showIp = !showIp}
            title={showIp ? 'Hide IP Address' : 'Reveal IP Address'}
            aria-label={showIp ? 'Hide IP Address' : 'Reveal IP Address'}
          >
            {#if showIp}
              <EyeOff size={13} />
            {:else}
              <Eye size={13} />
            {/if}
          </button>
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-label">
          <Cpu size={14} class="meta-icon" />
          <span>CPU</span>
        </div>
        <span class="meta-value truncate font-mono" title={cpuModel}>{cpuModel}</span>
      </div>

      <div class="meta-row">
        <div class="meta-label">
          <Layers size={14} class="meta-icon" />
          <span>OS</span>
        </div>
        <span class="meta-value font-mono">{osName}</span>
      </div>

      <div class="meta-row">
        <div class="meta-label">
          <MapPin size={14} class="meta-icon" />
          <span>Location</span>
        </div>
        <span class="meta-value">{locationStr}</span>
      </div>
    </div>

    <!-- Bottom Quick Action Buttons with clear outline & icon spacing -->
    <div class="quick-actions-section">
      <div class="actions-grid">
        <Button variant="outline" size="sm" icon={DownloadCloud} onclick={() => triggerAction('update')}>
          Update
        </Button>
        <Button variant="outline" size="sm" icon={FileText} onclick={() => triggerAction('logs')}>
          Logs
        </Button>
        <Button variant="outline" size="sm" icon={RotateCw} onclick={() => triggerAction('reboot')}>
          Reboot
        </Button>
        <Button variant="danger" size="sm" icon={Power} onclick={() => triggerAction('shutdown')}>
          Shutdown
        </Button>
      </div>
    </div>

    <!-- API & WS Ping Matrix -->
    <div class="ping-matrix">
      <div class="ping-tier">
        <span class="ping-tier-header">Core - Node</span>
        <div class="ping-rows">
          <div class="ping-row">
            <span class="ping-dot" class:online={$pingStore.coreApiPing > 0} class:offline={$pingStore.coreApiPing <= 0}></span>
            <span class="ping-key">API:</span>
            <span class="ping-val font-mono">{$pingStore.coreApiPing > 0 ? `${$pingStore.coreApiPing} ms` : 'Offline'}</span>
          </div>
          <div class="ping-row">
            <span class="ping-dot" class:online={$pingStore.coreWsPing > 0} class:offline={$pingStore.coreWsPing <= 0}></span>
            <span class="ping-key">WS:</span>
            <span class="ping-val font-mono">{$pingStore.coreWsPing > 0 ? `${$pingStore.coreWsPing} ms` : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div class="ping-divider"></div>

      <div class="ping-tier">
        <span class="ping-tier-header">Node - site</span>
        <div class="ping-rows">
          <div class="ping-row">
            <span class="ping-dot" class:online={$pingStore.siteApiPing > 0} class:offline={$pingStore.siteApiPing <= 0}></span>
            <span class="ping-key">API:</span>
            <span class="ping-val font-mono">{$pingStore.siteApiPing > 0 ? `${$pingStore.siteApiPing} ms` : 'Offline'}</span>
          </div>
          <div class="ping-row">
            <span class="ping-dot" class:online={$pingStore.siteWsPing > 0} class:offline={$pingStore.siteWsPing <= 0}></span>
            <span class="ping-key">WS:</span>
            <span class="ping-val font-mono">{$pingStore.siteWsPing > 0 ? `${$pingStore.siteWsPing} ms` : 'Offline'}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</Card>

<!-- Action Confirmation Dialog -->
{#if confirmAction}
  <Dialog
    open={true}
    title={confirmAction === 'reboot' ? 'Reboot Server Confirmation' : 'Shutdown Server Confirmation'}
    variant={confirmAction === 'shutdown' ? 'danger' : 'warning'}
    confirmText={confirmAction === 'reboot' ? 'Reboot Now' : 'Power Off'}
    onclose={() => confirmAction = null}
    onconfirm={executeConfirmAction}
  >
    <div class="confirm-body">
      <AlertTriangle size={24} class="confirm-icon" />
      <p>
        Are you sure you want to {confirmAction} the remote server?
        Active processes and sessions may be terminated.
      </p>
    </div>
  </Dialog>
{/if}

<!-- Update Options Modal -->
{#if showUpdateModal}
  <UpdateModal onclose={() => showUpdateModal = false} />
{/if}

<style>
  .server-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    justify-content: space-between;
  }

  .clock-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) 0;
    text-align: center;
    background: transparent !important;
  }

  .time-text {
    font-size: 54px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -1px;
    color: var(--text-primary);
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  }

  .date-text {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-top: 6px;
    font-weight: 500;
  }

  .meta-card {
    background: rgba(18, 24, 32, 0.65);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-xs);
  }

  .meta-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
  }

  :global(.meta-icon) {
    color: var(--text-muted);
  }

  .meta-value {
    color: var(--text-primary);
    font-weight: 500;
    max-width: 170px;
    text-align: right;
  }

  .ip-value-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .eye-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }

  .eye-btn:hover {
    color: var(--text-primary);
  }

  .quick-actions-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .ping-matrix {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
    font-size: var(--text-xs);
  }

  .ping-tier {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .ping-tier-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }

  .ping-rows {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .ping-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ping-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .ping-dot.online {
    background: #22c55e;
  }

  .ping-dot.offline {
    background: #ef4444;
  }

  .ping-key {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .ping-val {
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 500;
  }

  .ping-divider {
    width: 1px;
    height: 38px;
    background: var(--border-subtle);
    margin: 0 var(--space-3);
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-indicator.online {
    background-color: var(--accent);
    box-shadow: 0 0 6px var(--accent-subtle);
  }

  .confirm-body {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  :global(.confirm-icon) {
    color: var(--warning);
    flex-shrink: 0;
    margin-top: 2px;
  }
</style>
