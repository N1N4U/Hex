<script lang="ts">
  import { toasts, removeToast } from './toastStore';
  import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from '@lucide/svelte';
  import { slideRight, fade } from '../motion/transitions';

  const icons = {
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info
  };
</script>

<div class="toast-portal" aria-live="polite">
  {#each toasts.items as toast (toast.id)}
    {@const Icon = icons[toast.type]}
    <div
      class="toast-item {toast.type}"
      transition:slideRight={{ duration: 200 }}
    >
      <div class="toast-content">
        <span class="toast-icon">
          <Icon size={18} />
        </span>
        <span class="toast-msg">{toast.message}</span>
        <button
          class="toast-close"
          onclick={() => removeToast(toast.id)}
          aria-label="Close notification"
        >
          <X size={14} />
        </button>
      </div>
      {#if toast.duration > 0}
        <div
          class="toast-progress"
          style="animation-duration: {toast.duration}ms;"
          onanimationend={() => removeToast(toast.id)}
        ></div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .toast-portal {
    position: fixed;
    bottom: var(--space-4);
    right: var(--space-4);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-2);
    pointer-events: none;
    max-width: 360px;
    width: 100%;
  }

  .toast-item {
    pointer-events: auto;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-elevated);
    position: relative;
    overflow: hidden;
  }

  .toast-item.success {
    border-left: 3px solid var(--accent);
  }
  .toast-item.success .toast-icon {
    color: var(--accent);
  }

  .toast-item.warning {
    border-left: 3px solid var(--amber);
  }
  .toast-item.warning .toast-icon {
    color: var(--amber);
  }

  .toast-item.error {
    border-left: 3px solid var(--danger);
  }
  .toast-item.error .toast-icon {
    color: var(--danger);
  }

  .toast-item.info {
    border-left: 3px solid var(--info);
  }
  .toast-item.info .toast-icon {
    color: var(--info);
  }

  .toast-content {
    display: flex;
    align-items: center;
    padding: 12px 14px;
    gap: var(--space-3);
  }

  .toast-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .toast-msg {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--text-primary);
    line-height: 1.4;
  }

  .toast-close {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    padding: 2px;
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }

  .toast-close:hover {
    color: var(--text-primary);
  }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    background: currentColor;
    opacity: 0.4;
    animation: shrink linear forwards;
    transform-origin: left;
  }

  @keyframes shrink {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }

  .toast-item:hover .toast-progress {
    animation-play-state: paused;
  }
</style>
