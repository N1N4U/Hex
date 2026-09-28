<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import { stats } from '$lib/stores/core';

  let downHistory = $state<number[]>([]);
  let upHistory = $state<number[]>([]);

  const currentDown = $derived($stats?.net_recv_bytes ?? 0);
  const currentUp = $derived($stats?.net_sent_bytes ?? 0);

  $effect(() => {
    // Add point to history
    downHistory = [...downHistory.slice(-59), currentDown];
    upHistory = [...upHistory.slice(-59), currentUp];
  });

  const chartSeries = $derived([
    {
      name: 'Download',
      color: 'var(--chart-line-1)',
      data: downHistory
    },
    {
      name: 'Upload',
      color: 'var(--chart-line-2)',
      data: upHistory
    }
  ]);

  function formatSpeed(bytes: number) {
    if (bytes < 1024) return bytes + ' B/s';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB/s';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB/s';
  }
</script>

<Card label="NETWORK" navigable href="/home">
  <div class="network-content">
    <div class="chart-area">
      <LineChart series={chartSeries} height={90} />
    </div>

    <div class="network-stats-grid">
      <div class="stat-col">
        <span class="stat-label">UPLOAD</span>
        <span class="stat-val val-amber">{formatSpeed(currentUp)}</span>
      </div>
      <div class="stat-col">
        <span class="stat-label">DOWNLOAD</span>
        <span class="stat-val val-green">{formatSpeed(currentDown)}</span>
      </div>
      <div class="stat-col">
        <span class="stat-label">TOTAL</span>
        <span class="stat-val val-white">{formatSpeed(currentDown + currentUp)}</span>
      </div>
    </div>
  </div>
</Card>

<style>
  .network-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .chart-area {
    width: 100%;
  }

  .network-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }

  .stat-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-label {
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-weight: 600;
  }

  .stat-val {
    font-size: var(--text-sm);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .val-amber { color: var(--amber); }
  .val-green { color: var(--accent); }
  .val-white { color: var(--text-primary); }
</style>
