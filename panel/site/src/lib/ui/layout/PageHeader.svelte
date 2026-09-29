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
    margin-bottom: 20px;
    gap: 16px;
    user-select: none;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .page-title {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.4px;
    margin: 0;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .page-desc {
    font-size: 13.5px;
    color: #94a3b8;
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  @media (max-width: 640px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }
</style>
