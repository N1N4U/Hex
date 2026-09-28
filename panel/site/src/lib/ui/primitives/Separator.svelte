<script lang="ts">
  let {
    orientation = 'horizontal',
    text = ''
  }: {
    orientation?: 'horizontal' | 'vertical';
    text?: string;
  } = $props();
</script>

{#if text && orientation === 'horizontal'}
  <div class="separator-with-text">
    <div class="line"></div>
    <span class="text">{text}</span>
    <div class="line"></div>
  </div>
{:else}
  <div class="separator {orientation}"></div>
{/if}

<style>
  .separator.horizontal {
    width: 100%;
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-2) 0;
  }

  .separator.vertical {
    width: 1px;
    height: 100%;
    background: var(--border-subtle);
    margin: 0 var(--space-2);
  }

  .separator-with-text {
    display: flex;
    align-items: center;
    width: 100%;
    margin: var(--space-3) 0;
    gap: var(--space-3);
  }

  .line {
    flex: 1;
    height: 1px;
    background: var(--border-subtle);
  }

  .text {
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
