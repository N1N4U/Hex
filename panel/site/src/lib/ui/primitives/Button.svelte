<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ripple } from '../motion/clickAnimation';
  import Spinner from './Spinner.svelte';

  let {
    variant = 'secondary',
    size = 'md',
    disabled = false,
    loading = false,
    icon = null,
    iconRight = null,
    fullWidth = false,
    type = 'button',
    onclick,
    children,
    class: customClass = ''
  }: {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: any;
    iconRight?: any;
    fullWidth?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    class?: string;
  } = $props();

  const IconComponent = $derived(icon);
  const IconRightComponent = $derived(iconRight);
</script>

<button
  use:ripple
  {type}
  class="btn {variant} {size} {customClass}"
  class:full-width={fullWidth}
  class:is-loading={loading}
  disabled={disabled || loading}
  {onclick}
>
  {#if loading}
    <Spinner size="sm" color={variant === 'primary' ? '#000000' : 'var(--accent)'} />
  {:else if IconComponent}
    <IconComponent size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
  {/if}

  {#if children}
    <span class="btn-label">
      {@render children()}
    </span>
  {/if}

  {#if IconRightComponent && !loading}
    <IconRightComponent size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-weight: 500;
    transition: all var(--transition-fast);
    cursor: pointer;
    border: 1px solid transparent;
    user-select: none;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }

  .btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .full-width {
    width: 100%;
  }

  /* Sizes */
  .sm {
    padding: 6px 12px;
    font-size: var(--text-sm);
  }

  .md {
    padding: 8px 16px;
    font-size: var(--text-base);
  }

  .lg {
    padding: 10px 20px;
    font-size: var(--text-md);
  }

  /* Variants */
  .primary {
    background: var(--accent);
    color: #000000;
    font-weight: 600;
  }

  .primary:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: var(--shadow-accent);
  }

  .secondary {
    background: var(--bg-elevated);
    border-color: var(--border);
    color: var(--text-primary);
  }

  .secondary:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .ghost {
    background: transparent;
    border-color: transparent;
    color: var(--text-secondary);
  }

  .ghost:hover:not(:disabled) {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }

  .danger {
    background: var(--danger-subtle);
    border-color: var(--danger);
    color: var(--danger);
  }

  .danger:hover:not(:disabled) {
    background: var(--danger);
    color: #ffffff;
    box-shadow: var(--shadow-elevated);
  }

  .outline {
    background: transparent;
    border-color: var(--border);
    color: var(--text-primary);
  }

  .outline:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .btn-label {
    display: inline-flex;
    align-items: center;
  }
</style>
