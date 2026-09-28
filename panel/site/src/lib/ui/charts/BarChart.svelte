<script lang="ts">
  import Progress from '../feedback/Progress.svelte';

  let {
    items = []
  }: {
    items: Array<{
      label: string;
      used: number;
      total: number;
      color?: string;
    }>;
  } = $props();

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
</script>

<div class="bar-chart">
  {#each items as item}
    {@const percentage = item.total > 0 ? (item.used / item.total) * 100 : 0}
    <div class="bar-item">
      <div class="bar-header">
        <span class="mount-label">{item.label}</span>
        <span class="mount-val">
          {formatBytes(item.used)} / {formatBytes(item.total)}
        </span>
      </div>
      <Progress
        value={percentage}
        height="thin"
        color={item.color || 'var(--accent)'}
      />
    </div>
  {/each}
</div>

<style>
  .bar-chart {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
  }

  .bar-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mount-label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .mount-val {
    font-size: var(--text-xs);
    color: var(--text-primary);
    font-family: var(--font-mono);
  }
</style>
