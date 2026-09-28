<script lang="ts">
  import { Eye, EyeOff, X } from '@lucide/svelte';

  let {
    type = 'text',
    placeholder = '',
    value = $bindable(''),
    label = '',
    hint = '',
    error = '',
    disabled = false,
    icon = null,
    iconRight = null,
    required = false,
    name = '',
    autocomplete = 'off'
  }: {
    type?: 'text' | 'password' | 'email' | 'number' | 'search';
    placeholder?: string;
    value?: string;
    label?: string;
    hint?: string;
    error?: string;
    disabled?: boolean;
    icon?: any;
    iconRight?: any;
    required?: boolean;
    name?: string;
    autocomplete?: string;
  } = $props();

  let showPassword = $state(false);
  const actualType = $derived(
    type === 'password' ? (showPassword ? 'text' : 'password') : type
  );

  const IconLeft = $derived(icon);
  const IconRight = $derived(iconRight);

  function clearSearch() {
    value = '';
  }
</script>

<div class="input-group">
  {#if label}
    <label class="input-label" for={name}>
      {label}
      {#if required}<span class="req">*</span>{/if}
    </label>
  {/if}

  <div class="input-box" class:has-error={!!error} class:is-disabled={disabled}>
    {#if IconLeft}
      <span class="left-icon">
        <IconLeft size={16} />
      </span>
    {/if}

    <input
      id={name}
      {name}
      type={actualType}
      {placeholder}
      bind:value
      {disabled}
      {required}
      {autocomplete}
      class="native-input"
    />

    {#if type === 'password'}
      <button
        type="button"
        class="toggle-btn"
        onclick={() => (showPassword = !showPassword)}
        tabindex="-1"
        aria-label="Toggle password visibility"
      >
        {#if showPassword}
          <EyeOff size={16} />
        {:else}
          <Eye size={16} />
        {/if}
      </button>
    {:else if type === 'search' && value}
      <button
        type="button"
        class="toggle-btn"
        onclick={clearSearch}
        tabindex="-1"
        aria-label="Clear search"
      >
        <X size={16} />
      </button>
    {:else if IconRight}
      <span class="right-icon">
        <IconRight size={16} />
      </span>
    {/if}
  </div>

  {#if error}
    <span class="error-text">{error}</span>
  {:else if hint}
    <span class="hint-text">{hint}</span>
  {/if}
</div>

<style>
  .input-group {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 6px;
  }

  .input-label {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .req {
    color: var(--danger);
    margin-left: 2px;
  }

  .input-box {
    display: flex;
    align-items: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    padding: 0 12px;
    height: 38px;
  }

  .input-box:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .input-box.has-error {
    border-color: var(--danger);
    box-shadow: 0 0 0 3px var(--danger-glow);
  }

  .input-box.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .native-input {
    flex: 1;
    height: 100%;
    color: var(--text-primary);
    font-size: var(--text-base);
    background: transparent;
  }

  .native-input::placeholder {
    color: var(--text-muted);
  }

  .left-icon, .right-icon {
    display: flex;
    align-items: center;
    color: var(--text-muted);
  }

  .left-icon {
    margin-right: var(--space-2);
  }

  .right-icon {
    margin-left: var(--space-2);
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    color: var(--text-muted);
    padding: 4px;
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }

  .toggle-btn:hover {
    color: var(--text-primary);
  }

  .error-text {
    font-size: var(--text-xs);
    color: var(--danger);
  }

  .hint-text {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }
</style>
