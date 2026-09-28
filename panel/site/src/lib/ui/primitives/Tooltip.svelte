<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade } from '../motion/transitions';

  let {
    content = '',
    position = 'top',
    delay = 300,
    children
  }: {
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    children?: Snippet;
  } = $props();

  let visible = $state(false);
  let timeoutId: number | null = null;

  function show() {
    timeoutId = window.setTimeout(() => {
      visible = true;
    }, delay);
  }

  function hide() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    visible = false;
  }
</script>

<div
  class="tooltip-wrapper"
  onmouseenter={show}
  onmouseleave={hide}
  onfocusin={show}
  onfocusout={hide}
  role="presentation"
>
  {#if children}
    {@render children()}
  {/if}

  {#if visible && content}
    <div class="tooltip-bubble {position}" transition:fade={{ duration: 150 }}>
      {content}
    </div>
  {/if}
</div>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tooltip-bubble {
    position: absolute;
    z-index: var(--z-dropdown);
    padding: 4px 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--text-xs);
    white-space: nowrap;
    pointer-events: none;
    box-shadow: var(--shadow-elevated);
  }

  .top {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-6px);
  }

  .bottom {
    top: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(6px);
  }

  .left {
    right: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(-6px);
  }

  .right {
    left: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(6px);
  }
</style>
