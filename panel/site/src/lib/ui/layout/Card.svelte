<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronRight } from '@lucide/svelte';

  let {
    label = '',
    navigable = false,
    href = '',
    padding = 'md',
    glass = false,
    onclick,
    children
  }: {
    label?: string;
    navigable?: boolean;
    href?: string;
    padding?: 'sm' | 'md' | 'lg';
    glass?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  } = $props();

  function handleCardClick(e: MouseEvent) {
    if (onclick) {
      onclick(e);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (onclick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onclick(e as any);
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="card {padding}"
  class:glass-card={glass}
  class:is-navigable={navigable || !!onclick}
  class:is-clickable={!!onclick}
  onclick={handleCardClick}
  onkeydown={handleKeydown}
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? 0 : undefined}
>
  {#if label || navigable || onclick}
    <div class="card-header">
      {#if label}
        <span class="card-label">{label}</span>
      {/if}
      {#if navigable || onclick}
        {#if href && !onclick}
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
    background: linear-gradient(145deg, rgba(16, 20, 27, 0.96) 0%, rgba(9, 11, 16, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-lg);
    box-shadow: none;
    transition: all var(--transition-base);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }

  .glass-card {
    background: linear-gradient(145deg, rgba(16, 20, 27, 0.97) 0%, rgba(8, 10, 14, 0.99) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: none;
  }

  .is-clickable {
    cursor: pointer;
  }

  .is-navigable:hover, .is-clickable:hover {
    border-color: rgba(255, 255, 255, 0.22);
    box-shadow: none;
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
