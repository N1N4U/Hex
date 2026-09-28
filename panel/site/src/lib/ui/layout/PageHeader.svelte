<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title = '',
    description = '',
    actions
  }: {
    title: string;
    description?: string;
    actions?: Snippet;
  } = $props();
</script>

<div class="page-header">
  <div class="title-group">
    <h1 class="page-title">{title}</h1>
    {#if description}
      <p class="page-desc">{description}</p>
    {/if}
  </div>

  {#if actions}
    <div class="header-actions">
      {@render actions()}
    </div>
  {/if}
</div>

<style>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-5);
    gap: var(--space-4);
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .page-title {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  .page-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
</style>
