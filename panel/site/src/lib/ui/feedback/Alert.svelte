<script lang="ts">
  import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from '@lucide/svelte';
  import { fade } from '../motion/transitions';

  let {
    variant = 'info',
    title = '',
    message = '',
    dismissible = false
  }: {
    variant?: 'success' | 'warning' | 'danger' | 'info';
    title?: string;
    message?: string;
    dismissible?: boolean;
  } = $props();

  let dismissed = $state(false);

  const icons = {
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: AlertCircle,
    info: Info
  };

  const Icon = $derived(icons[variant]);
</script>

{#if !dismissed}
  <div class="alert {variant}" transition:fade={{ duration: 150 }}>
    <span class="alert-icon">
      <Icon size={18} />
    </span>
    <div class="alert-body">
      {#if title}
        <h4 class="alert-title">{title}</h4>
      {/if}
      {#if message}
        <p class="alert-msg">{message}</p>
      {/if}
    </div>
    {#if dismissible}
      <button
        class="dismiss-btn"
        onclick={() => (dismissed = true)}
        aria-label="Dismiss alert"
      >
        <X size={14} />
      </button>
    {/if}
  </div>
{/if}

<style>
  .alert {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: 12px 14px;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
  }

  .alert.success {
    background: var(--accent-subtle);
    border-left: 3px solid var(--accent);
    color: var(--accent);
  }

  .alert.warning {
    background: var(--amber-subtle);
    border-left: 3px solid var(--amber);
    color: var(--amber);
  }

  .alert.danger {
    background: var(--danger-subtle);
    border-left: 3px solid var(--danger);
    color: var(--danger);
  }

  .alert.info {
    background: var(--info-subtle);
    border-left: 3px solid var(--info);
    color: var(--info);
  }

  .alert-icon {
    display: flex;
    align-items: center;
    margin-top: 1px;
    flex-shrink: 0;
  }

  .alert-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .alert-title {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .alert-msg {
    font-size: var(--text-sm);
    color: var(--text-primary);
  }

  .dismiss-btn {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    padding: 2px;
    border-radius: var(--radius-sm);
  }

  .dismiss-btn:hover {
    color: var(--text-primary);
  }
</style>
