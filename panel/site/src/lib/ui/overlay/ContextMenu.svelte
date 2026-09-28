<script lang="ts">
  import { fade } from '../motion/transitions';

  let {
    x = 0,
    y = 0,
    items = [],
    onclose
  }: {
    x: number;
    y: number;
    items: Array<{ label: string; icon?: any; action: () => void; danger?: boolean }>;
    onclose: () => void;
  } = $props();

  function handleClickOutside() {
    onclose();
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  class="context-menu"
  style="top: {y}px; left: {x}px;"
  transition:fade={{ duration: 100 }}
>
  {#each items as item}
    {@const Icon = item.icon}
    <button
      type="button"
      class="context-item"
      class:danger={item.danger}
      onclick={() => {
        item.action();
        onclose();
      }}
    >
      {#if Icon}
        <Icon size={14} />
      {/if}
      <span>{item.label}</span>
    </button>
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    z-index: var(--z-dropdown);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-elevated);
    padding: 4px;
    min-width: 160px;
    display: flex;
    flex-direction: column;
  }

  .context-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--text-primary);
    transition: background var(--transition-fast);
    text-align: left;
    width: 100%;
  }

  .context-item:hover {
    background: var(--bg-surface-hover);
  }

  .context-item.danger {
    color: var(--danger);
  }

  .context-item.danger:hover {
    background: var(--danger-subtle);
  }
</style>
