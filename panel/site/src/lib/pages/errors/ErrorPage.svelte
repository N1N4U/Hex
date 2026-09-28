<script lang="ts">
  import Button from '$lib/ui/primitives/Button.svelte';
  import { goto } from '$app/navigation';

  let {
    status = 500,
    message = 'An unexpected error occurred'
  }: {
    status?: number;
    message?: string;
  } = $props();
</script>

<div class="error-container">
  <div class="error-code">{status}</div>
  <h2 class="error-title">System Error</h2>
  <p class="error-desc">{message}</p>
  <Button variant="secondary" onclick={() => goto('/home')}>
    Return to Dashboard
  </Button>
</div>

<style>
  .error-container {
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--bg-base);
    padding: var(--space-4);
    gap: var(--space-3);
  }

  .error-code {
    font-size: 72px;
    font-weight: 800;
    color: var(--danger);
    letter-spacing: -2px;
    line-height: 1;
  }

  .error-title {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .error-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    max-width: 440px;
    margin-bottom: var(--space-2);
  }
</style>
