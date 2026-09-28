<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from '@lucide/svelte';
  import { fade, scaleIn } from '../motion/transitions';

  let {
    title = '',
    size = 'md',
    closeOnBackdrop = true,
    onclose,
    children,
    footer
  }: {
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'full';
    closeOnBackdrop?: boolean;
    onclose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  } = $props();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onclose?.();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="dialog-backdrop"
  onclick={handleBackdropClick}
  transition:fade={{ duration: 150 }}
  role="presentation"
>
  <div
    class="dialog-panel {size}"
    transition:scaleIn={{ duration: 200, start: 0.95 }}
    role="dialog"
    aria-modal="true"
  >
    {#if title}
      <div class="dialog-header">
        <h3 class="dialog-title">{title}</h3>
        <button
          type="button"
          class="dialog-close"
          onclick={() => onclose?.()}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </div>
    {/if}

    <div class="dialog-body">
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if footer}
      <div class="dialog-footer">
        {@render footer()}
      </div>
    {/if}
  </div>
</div>

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: var(--bg-overlay);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: var(--z-dialog);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
  }

  .dialog-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-elevated);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    width: 100%;
    overflow: hidden;
  }

  .dialog-panel.sm { max-width: 400px; }
  .dialog-panel.md { max-width: 560px; }
  .dialog-panel.lg { max-width: 720px; }
  .dialog-panel.full { max-width: 90vw; }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .dialog-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .dialog-close {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    padding: 4px;
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }

  .dialog-close:hover {
    color: var(--text-primary);
  }

  .dialog-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .dialog-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: 16px 20px;
    border-top: 1px solid var(--border-subtle);
  }
</style>
