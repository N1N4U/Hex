<script lang="ts">
  import Spinner from '$lib/ui/primitives/Spinner.svelte';

  let {
    message = 'Connecting to server...'
  }: {
    message?: string;
  } = $props();
</script>

<div class="loading-container">
  <div class="logo-text">Hex</div>
  <Spinner size="lg" color="var(--accent)" />
  <p class="loading-msg">{message}</p>
</div>

<style>
  .loading-container {
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-base);
    gap: var(--space-4);
  }

  .logo-text {
    font-size: 36px;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: -1px;
    text-shadow: 0 0 16px var(--accent-glow);
  }

  .loading-msg {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
</style>
