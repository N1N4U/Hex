<script lang="ts">
  import Button from '$lib/ui/primitives/Button.svelte';
  import { goto } from '$app/navigation';
</script>

<div class="error-container">
  <div class="error-code">404</div>
  <h2 class="error-title">Page not found</h2>
  <p class="error-desc">The page or resource you are looking for does not exist on this server.</p>
  <Button variant="primary" onclick={() => goto('/home')}>
    Return to Home
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
    font-size: 80px;
    font-weight: 800;
    color: var(--text-muted);
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
    max-width: 400px;
    margin-bottom: var(--space-2);
  }
</style>
