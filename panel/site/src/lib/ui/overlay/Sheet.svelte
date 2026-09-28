<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from '@lucide/svelte';
  import { fade, slideRight, slideLeft } from '../motion/transitions';

  let {
    position = 'right',
    width = '480px',
    title = '',
    onclose,
    children,
    footer
  }: {
    position?: 'right' | 'left';
    width?: string;
    title?: string;
    onclose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  } = $props();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
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
  class="sheet-backdrop"
  onclick={handleBackdropClick}
  transition:fade={{ duration: 200 }}
  role="presentation"
>
  <div
    class="sheet-panel {position}"
    style="width: {width};"
    transition:slideRight={{ duration: 250 }}
    role="dialog"
    aria-modal="true"
  >
    <div class="sheet-header">
      <h3 class="sheet-title">{title}</h3>
      <button
        type="button"
        class="sheet-close"
        onclick={() => onclose?.()}
        aria-label="Close sheet"
      >
        <X size={18} />
      </button>
    </div>

    <div class="sheet-body">
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if footer}
      <div class="sheet-footer">
        {@render footer()}
      </div>
    {/if}
  </div>
</div>

<style>
  .sheet-backdrop {
    position: fixed;
    inset: 0;
    background: var(--bg-overlay);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: var(--z-dialog);
    display: flex;
    justify-content: flex-end;
  }

  .sheet-panel {
    background: var(--bg-elevated);
    border-left: 1px solid var(--border);
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-elevated);
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .sheet-title {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .sheet-close {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    padding: 4px;
    border-radius: var(--radius-sm);
  }

  .sheet-close:hover {
    color: var(--text-primary);
  }

  .sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .sheet-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
