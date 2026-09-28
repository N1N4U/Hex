<script lang="ts">
  import { ChevronDown, Check } from '@lucide/svelte';
  import { fade, slideUp } from '../motion/transitions';

  let {
    options = [],
    value = $bindable(''),
    placeholder = 'Select an option',
    label = '',
    disabled = false
  }: {
    options: Array<{ label: string; value: string; icon?: any; disabled?: boolean }>;
    value?: string;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
  } = $props();

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement | null = null;

  const selectedOption = $derived(options.find((opt) => opt.value === value));

  function toggleOpen() {
    if (!disabled) {
      isOpen = !isOpen;
    }
  }

  function selectOption(optVal: string) {
    value = optVal;
    isOpen = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isOpen = false;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
      isOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="dropdown-group" bind:this={dropdownRef}>
  {#if label}
    <span class="dropdown-label">{label}</span>
  {/if}

  <button
    type="button"
    class="dropdown-trigger"
    class:is-open={isOpen}
    class:is-disabled={disabled}
    onclick={toggleOpen}
    {disabled}
  >
    <span class="trigger-label" class:placeholder={!selectedOption}>
      {selectedOption ? selectedOption.label : placeholder}
    </span>
    <span class="chevron" class:rotate={isOpen}>
      <ChevronDown size={16} />
    </span>
  </button>

  {#if isOpen}
    <div class="dropdown-menu" transition:slideUp={{ duration: 150, distance: 4 }}>
      {#each options as opt}
        <button
          type="button"
          class="dropdown-item"
          class:selected={opt.value === value}
          disabled={opt.disabled}
          onclick={() => selectOption(opt.value)}
        >
          <span class="item-label">{opt.label}</span>
          {#if opt.value === value}
            <span class="check-icon">
              <Check size={14} />
            </span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dropdown-group {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 6px;
  }

  .dropdown-label {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0 12px;
    height: 38px;
    color: var(--text-primary);
    transition: all var(--transition-fast);
  }

  .dropdown-trigger:hover:not(:disabled) {
    border-color: var(--accent);
  }

  .dropdown-trigger.is-open {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .dropdown-trigger.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .trigger-label.placeholder {
    color: var(--text-muted);
  }

  .chevron {
    display: flex;
    align-items: center;
    color: var(--text-secondary);
    transition: transform var(--transition-fast);
  }

  .chevron.rotate {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-elevated);
    z-index: var(--z-dropdown);
    padding: 4px;
    max-height: 240px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--text-base);
    transition: background var(--transition-fast);
    text-align: left;
  }

  .dropdown-item:hover:not(:disabled) {
    background: var(--bg-surface-hover);
  }

  .dropdown-item.selected {
    color: var(--accent);
    font-weight: 500;
  }

  .dropdown-item:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .check-icon {
    display: flex;
    align-items: center;
    color: var(--accent);
  }
</style>
