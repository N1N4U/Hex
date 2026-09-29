<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Dialog from '$lib/ui/overlay/Dialog.svelte';
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

  // Confirmation dialog states
  let confirmAction = $state<'reboot' | 'shutdown' | null>(null);

  onMount(() => {
    const updateTime = () => {
      const now = new Date();
      // Remove seconds per spec: HH:MM
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
  const ipAddress = $derived($stats?.host_ip || nodeStore.activeNode?.ip_address || '127.0.0.1');
  const maskedIp = $derived(showIp ? ipAddress : (ipAddress ? '••••••••••••' : '--'));

  let locationStr = $state('Local VPS Node');
  $effect(() => {
    const ip = ipAddress;
    if (ip && !ip.startsWith('127.') && ip !== 'localhost' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
      fetch(`https://ip-api.com/json/${ip}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.city && data.country) {
            locationStr = `${data.city}, ${data.country}`;
          }
        })
        .catch(() => {
          locationStr = 'Remote VPS';
        });
    } else {
      locationStr = 'Local VPS Node';
    }
  });

  const coreApiPing = $derived($pingStore.coreApiPing);
  const coreWsPing = $derived($pingStore.coreWsPing);
  const siteApiPing = $derived($pingStore.siteApiPing);
  const siteWsPing = $derived($pingStore.siteWsPing);

  function triggerAction(action: 'reboot' | 'shutdown' | 'update' | 'logs') {
    if (action === 'reboot' || action === 'shutdown') {
      confirmAction = action;
    } else if (action === 'update') {
      addToast('Checking for system and container updates on Core...', 'info');
      post('/core/system/update', {}).then(() => {
        addToast('Update triggered', 'info');
      }).catch(() => {});
    } else if (action === 'logs') {
      addToast('Navigating to system logs...', 'info');
    }
  }

  async function executeConfirmedAction() {
    const act = confirmAction;
    confirmAction = null;
    if (act === 'reboot') {
      addToast('Initiating server reboot sequence...', 'warning');
      try {
        await post('/core/system/reboot', {});
      } catch {}
    } else if (act === 'shutdown') {
      addToast('Powering down system now...', 'danger');
      try {
        await post('/core/system/shutdown', {});
      } catch {}
    }
  }
</script>

<Card label="SERVER" glass padding="lg">
  <div class="hero-container">
    <!-- Clock & Date -->
    <div class="clock-section">
      <div class="clock-display">{currentTime || '--:--'}</div>
      <div class="date-display">{currentDate}</div>
    </div>

    <!-- Server Details -->
    <div class="info-list">
      <div class="info-row">
        <div class="info-label">
          <span class="status-indicator online"></span>
          <span>Uptime</span>
        </div>
        <span class="info-val font-mono">{uptime}</span>
      </div>

      <div class="info-row">
        <div class="info-label">
          <Server size={14} class="text-muted" />
          <span>Host IP</span>
        </div>
        <div class="ip-group">
          <span class="info-val font-mono">{maskedIp}</span>
          <button
            type="button"
            class="eye-btn"
            onclick={() => (showIp = !showIp)}
            aria-label="Toggle IP visibility"
          >
            {#if showIp}
              <EyeOff size={14} />
            {:else}
              <Eye size={14} />
            {/if}
          </button>
        </div>
      </div>

      <div class="info-row">
        <div class="info-label">
          <Cpu size={14} class="text-muted" />
          <span>CPU</span>
        </div>
        <span class="info-val truncate">{cpuModel}</span>
      </div>

      <div class="info-row">
        <div class="info-label">
          <Layers size={14} class="text-muted" />
          <span>OS</span>
        </div>
        <span class="info-val">{osName}</span>
      </div>

      <div class="info-row">
        <div class="info-label">
          <MapPin size={14} class="text-muted" />
          <span>Location</span>
        </div>
        <span class="info-val">{locationStr}</span>
      </div>
    </div>

    <!-- Quick Actions (2x2 grid) -->
    <div class="quick-actions-section">
      <span class="quick-label">QUICK ACTIONS</span>
      <div class="actions-grid">
        <Button variant="secondary" size="sm" onclick={() => triggerAction('reboot')} icon={RotateCw}>
          Reboot
        </Button>
        <Button variant="secondary" size="sm" onclick={() => triggerAction('update')} icon={DownloadCloud}>
          Update
        </Button>
        <Button variant="secondary" size="sm" onclick={() => triggerAction('logs')} icon={FileText}>
          Logs
        </Button>
        <Button variant="danger" size="sm" onclick={() => triggerAction('shutdown')} icon={Power}>
          Shut Down
        </Button>
      </div>
    </div>

    <!-- Dual Tier Ping Latency Matrix -->
    <div class="ping-matrix">
      <!-- Core - Node -->
      <div class="ping-tier">
        <span class="ping-tier-header">Core - Node</span>
        <div class="ping-rows">
          <div class="ping-row">
            <span class="ping-dot" class:online={coreApiPing > 0} class:offline={coreApiPing <= 0}></span>
            <span class="ping-key">API:</span>
            <span class="ping-val font-mono">{coreApiPing > 0 ? `${coreApiPing} ms` : 'Offline'}</span>
          </div>
          <div class="ping-row">
            <span class="ping-dot" class:online={coreWsPing > 0} class:offline={coreWsPing <= 0}></span>
            <span class="ping-key">WS:</span>
            <span class="ping-val font-mono">{coreWsPing > 0 ? `${coreWsPing} ms` : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div class="ping-divider"></div>

      <!-- Node - site -->
      <div class="ping-tier">
        <span class="ping-tier-header">Node - site</span>
        <div class="ping-rows">
          <div class="ping-row">
            <span class="ping-dot" class:online={siteApiPing > 0} class:offline={siteApiPing <= 0}></span>
            <span class="ping-key">API:</span>
            <span class="ping-val font-mono">{siteApiPing > 0 ? `${siteApiPing} ms` : 'Offline'}</span>
          </div>
          <div class="ping-row">
            <span class="ping-dot" class:online={siteWsPing > 0 && $wsStatus === 'connected'} class:offline={siteWsPing <= 0 || $wsStatus !== 'connected'}></span>
            <span class="ping-key">WS:</span>
            <span class="ping-val font-mono">{siteWsPing > 0 && $wsStatus === 'connected' ? `${siteWsPing} ms` : 'Offline'}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</Card>

{#if confirmAction}
  <Dialog
    title={confirmAction === "reboot" ? "Reboot Server?" : "Shut Down Server?"}
    size="sm"
    onclose={() => (confirmAction = null)}
  >
    <div class="confirm-content">
      <div class="warning-row">
        <AlertTriangle size={18} class="warn-icon" />
        <p class="confirm-warning">
          This action will immediately {confirmAction === 'reboot' ? 'restart' : 'power off'} the system. All running containers will be halted.
        </p>
      </div>
      <div class="confirm-buttons">
        <Button variant="ghost" onclick={() => (confirmAction = null)}>
          Cancel
        </Button>
        <Button variant="danger" onclick={executeConfirmedAction}>
          {confirmAction === 'reboot' ? 'Confirm Reboot' : 'Shut Down Now'}
        </Button>
      </div>
    </div>
  </Dialog>
{/if}

<style>
  .hero-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    height: 100%;
    justify-content: space-between;
  }

  .clock-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) 0;
    text-align: center;
    background: radial-gradient(circle, rgba(0, 255, 136, 0.05) 0%, transparent 70%);
    border-radius: var(--radius-lg);
  }

  .clock-display {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-sans);
    letter-spacing: -1px;
    line-height: 1.1;
  }

  .date-display {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-top: 4px;
    letter-spacing: 0.5px;
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    background: rgba(0, 0, 0, 0.2);
    padding: 12px 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
  }

  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-xs);
  }

  .info-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
  }

  .info-val {
    color: var(--text-primary);
    font-weight: 500;
  }

  .font-mono {
    font-family: var(--font-mono);
  }

  .truncate {
    max-width: 160px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ip-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .eye-btn {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    padding: 2px;
    background: none;
    border: none;
    cursor: pointer;
  }

  .eye-btn:hover {
    color: var(--text-primary);
  }

  .quick-actions-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .quick-label {
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
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
    background: #22c55e;
  }

  .confirm-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .warning-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.25);
    padding: 10px 12px;
    border-radius: var(--radius-md);
  }

  :global(.warn-icon) {
    color: #ef4444;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .confirm-warning {
    font-size: var(--text-sm);
    color: var(--text-primary);
    line-height: 1.5;
  }

  .confirm-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
