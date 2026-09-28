<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'default',
    size = 'sm',
    dot = false,
    children
  }: {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
    size?: 'sm' | 'md';
    dot?: boolean;
    children?: Snippet;
  } = $props();
</script>

<span class="badge {variant} {size}">
  {#if dot}
    <span class="dot"></span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius-full);
    font-family: var(--font-sans);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  .sm {
    padding: 2px 8px;
    font-size: var(--text-xs);
  }

  .md {
    padding: 4px 10px;
    font-size: var(--text-sm);
  }

  .default {
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border-color: var(--border);
  }

  .success {
    background: var(--accent-subtle);
    color: var(--accent);
    border-color: rgba(0, 255, 136, 0.2);
  }

  .warning {
    background: var(--amber-subtle);
    color: var(--amber);
    border-color: rgba(245, 197, 24, 0.2);
  }

  .danger {
    background: var(--danger-subtle);
    color: var(--danger);
    border-color: rgba(255, 77, 77, 0.2);
  }

  .info {
    background: var(--info-subtle);
    color: var(--info);
    border-color: rgba(77, 159, 255, 0.2);
  }

  .outline {
    background: transparent;
    color: var(--text-secondary);
    border-color: var(--border);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
    margin-right: 5px;
    flex-shrink: 0;
  }
</style>
