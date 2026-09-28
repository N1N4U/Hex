<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import Progress from '$lib/ui/feedback/Progress.svelte';
  import BarChart from '$lib/ui/charts/BarChart.svelte';
  import { stats } from '$lib/stores/core';

  const used = $derived($stats?.disk_used ?? 0);
  const total = $derived($stats?.disk_total ?? 1);
  const free = $derived(Math.max(0, total - used));
  const percent = $derived(total > 0 ? (used / total) * 100 : 0);

  function formatGB(bytes: number) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  const mountItems = $derived([
    {
      label: '/',
      used: used,
      total: total
    },
    {
      label: '/boot/efi',
      used: 120 * 1024 * 1024,
      total: 512 * 1024 * 1024
    }
  ]);
</script>

<Card label="STORAGE" navigable href="/files">
  <div class="storage-content">
    <div class="storage-header">
      <div class="free-text">
        <span class="free-val">{formatGB(free)}</span>
        <span class="free-sub">Free</span>
      </div>
      <span class="percent-badge">{percent.toFixed(0)}% Used</span>
    </div>

    <div class="main-bar">
      <Progress value={percent} height="normal" />
      <div class="storage-subinfo">
        <span>Used: {formatGB(used)}</span>
        <span>Total: {formatGB(total)}</span>
      </div>
    </div>

    <div class="mounts-section">
      <BarChart items={mountItems} />
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
    align-items: baseline;
    justify-content: space-between;
  }

  .free-text {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .free-val {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-sans);
  }

  .free-sub {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .percent-badge {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--accent);
    font-weight: 600;
  }

  .main-bar {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .storage-subinfo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .mounts-section {
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }
</style>
