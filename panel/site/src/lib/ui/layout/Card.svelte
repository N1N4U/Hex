<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronRight } from '@lucide/svelte';

  let {
    label = '',
    navigable = false,
    href = '',
    padding = 'md',
    glass = false,
    children
  }: {
    label?: string;
    navigable?: boolean;
    href?: string;
    padding?: 'sm' | 'md' | 'lg';
    glass?: boolean;
    children?: Snippet;
  } = $props();
</script>

<div
  class="card {padding}"
  class:glass-card={glass}
  class:is-navigable={navigable}
>
  {#if label || navigable}
    <div class="card-header">
      {#if label}
        <span class="card-label">{label}</span>
      {/if}
      {#if navigable}
        {#if href}
          <a {href} class="nav-arrow" aria-label="Go to {label}">
            <ChevronRight size={16} />
          </a>
        {:else}
          <span class="nav-arrow">
            <ChevronRight size={16} />
          </span>
        {/if}
      {/if}
    </div>
  {/if}

  <div class="card-body">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  .card {
    background: rgba(18, 22, 30, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: var(--radius-lg);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 8px 24px rgba(0, 0, 0, 0.35);
    transition: all var(--transition-base);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }

  .glass-card {
    background: rgba(15, 19, 28, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 12px 32px rgba(0, 0, 0, 0.45);
  }

  .is-navigable:hover {
    border-color: var(--border-focus);
    box-shadow: var(--shadow-card), 0 0 16px var(--accent-glow);
  }

  .is-navigable:hover .nav-arrow {
    color: var(--accent);
    transform: translateX(2px);
  }

  .sm {
    padding: 12px;
  }

  .md {
    padding: 16px;
  }

  .lg {
    padding: 20px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  .card-label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    letter-spacing: 1px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .nav-arrow {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    transition: all var(--transition-fast);
  }

  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
