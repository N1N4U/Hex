<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Dialog from '$lib/ui/overlay/Dialog.svelte';
  import { openDialog, closeDialog } from '$lib/ui/overlay/dialogStore';
  import { stats, wsStatus } from '$lib/stores/core';
  import { addToast } from '$lib/ui/feedback/toastStore';
  import { onMount } from 'svelte';
  import {
    Clock,
    RotateCw,
    DownloadCloud,
    FileText,
    Power,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Server,
    Cpu,
    MapPin,
    Layers
  } from '@lucide/svelte';

  let currentTime = $state('');
  let currentDate = $state('');
  let showIp = $state(false);

  // Confirmation dialog states
  let confirmAction = $state<'reboot' | 'shutdown' | null>(null);

  onMount(() => {
    const updateTime = () => {
      const now = new Date();
      currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      currentDate = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  });

  const uptime = $derived($stats?.uptime ?? '0m');
  const osName = $derived($stats?.os_name ?? 'Linux');
  const cpuModel = $derived($stats?.cpu_model ?? 'Virtual CPU');
  const ipAddress = $derived($stats?.ip_address ?? '127.0.0.1');
  const maskedIp = $derived(showIp ? ipAddress : '???.???.???.???');

  function triggerAction(action: 'reboot' | 'shutdown' | 'update' | 'logs') {
    if (action === 'reboot' || action === 'shutdown') {
      confirmAction = action;
    } else if (action === 'update') {
      addToast('Checking for system and container updates...', 'info');
    } else if (action === 'logs') {
      addToast('Navigating to system logs...', 'info');
    }
  }

  function executeConfirmedAction() {
    if (confirmAction === 'reboot') {
      addToast('Initiating server reboot sequence...', 'warning');
    } else if (confirmAction === 'shutdown') {
      addToast('Powering down system now...', 'danger');
    }
    confirmAction = null;
  }
</script>

<Card label="SERVER" glass padding="lg">
  <div class="hero-container">
    <!-- Clock & Date -->
    <div class="clock-section">
      <div class="clock-display">{currentTime || '--:--:--'}</div>
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
        <span class="info-val">Local VPS Node</span>
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

    <!-- Latency & Connection Status Bar -->
    <div class="status-bar">
      <div class="status-pair">
        <span class="status-indicator" class:online={$wsStatus === 'connected'} class:offline={$wsStatus !== 'connected'}></span>
        <span class="status-text">WS: {$wsStatus === 'connected' ? 'Connected' : 'Offline'}</span>
      </div>
      <div class="status-pair">
        <span class="status-indicator online"></span>
        <span class="status-text">API: 8ms</span>
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
      <p class="confirm-warning">
        ?? This action will immediately {confirmAction === 'reboot' ? 'restart' : 'power off'} the system. All running containers will be halted.
      </p>
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

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .status-pair {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-indicator.online {
    background: var(--status-online);
    box-shadow: 0 0 6px var(--status-online);
  }

  .status-indicator.offline {
    background: var(--status-offline);
    box-shadow: 0 0 6px var(--status-offline);
  }

  .status-text {
    color: var(--text-secondary);
  }

  .confirm-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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
