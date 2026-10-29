<script lang="ts">
  import type { Snippet, Component } from 'svelte';
  import { Loader2 } from '@lucide/svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    icon?: Component<{ size?: number; class?: string }>;
    iconRight?: Component<{ size?: number; class?: string }>;
    children?: Snippet;
    onclick?: (e: MouseEvent) => void;
    [key: string]: any;
  }

  let {
    variant = 'secondary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    type = 'button',
    class: className = '',
    icon: IconComponent,
    iconRight: IconRightComponent,
    children,
    onclick,
    ...restProps
  }: Props = $props();
</script>

<button
  type={type}
  class="btn {variant} {size} {className}"
  class:full-width={fullWidth}
  class:loading
  disabled={disabled || loading}
  onclick={onclick}
  {...restProps}
>
  {#if loading}
    <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} class="spin" />
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
    gap: 8px !important;
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
    padding: 7px 14px;
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
    box-shadow: none;
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
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    color: var(--text-primary);
  }

  .outline:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.35) !important;
    color: #ffffff;
  }

  .btn-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
</style>
