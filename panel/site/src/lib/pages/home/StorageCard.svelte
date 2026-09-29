<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import Progress from '$lib/ui/feedback/Progress.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { stats } from '$lib/stores/core';

  const used = $derived($stats?.disk_used ?? 0);
  const total = $derived($stats?.disk_total ?? 0);
  const free = $derived(total > 0 ? Math.max(0, total - used) : 0);
  const percent = $derived(total > 0 ? (used / total) * 100 : 0);

  function formatGB(bytes: number) {
    if (bytes <= 0) return '0.0 GB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  // Purely dynamic: only displays real mounts from connected core, no fake /boot/efi
  const mountItems = $derived(
    total > 0
      ? [
          {
            label: '/',
            used: used,
            total: total
          }
        ]
      : []
  );
</script>

<Card label="STORAGE" navigable href="/files">
  <div class="storage-content">
    <div class="storage-header">
      <div class="free-text">
        <span class="free-val">{total > 0 ? formatGB(free) : '-- GB'}</span>
        <span class="free-sub">{total > 0 ? 'Free' : 'Offline'}</span>
      </div>
      <span class="percent-badge">{total > 0 ? `${percent.toFixed(0)}% Used` : 'No Core'}</span>
    </div>

    <div class="main-bar">
      <Progress value={percent} height="normal" />
      <div class="storage-subinfo">
        <span>Used: {total > 0 ? formatGB(used) : '--'}</span>
        <span>Total: {total > 0 ? formatGB(total) : '--'}</span>
      </div>
    </div>

    <div class="mounts-section">
      {#if mountItems.length > 0}
        <BarChart items={mountItems} />
      {:else}
        <div class="no-mounts">
          <span>Awaiting disk telemetry from VPS Core...</span>
        </div>
      {/if}
    </div>
  </div>
</Card>

<style>
  .storage-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .storage-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }

  .free-text {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .free-val {
    font-size: var(--text-2xl);
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text-primary);
  }

  .free-sub {
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .percent-badge {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--accent);
    background: var(--accent-subtle);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .main-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .storage-subinfo {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .mounts-section {
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }

  .no-mounts {
    padding: 12px 0;
    font-size: 11.5px;
    color: var(--text-muted);
    text-align: center;
  }
</style>
