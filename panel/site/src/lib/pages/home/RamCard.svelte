<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import GaugeChart from '$lib/ui/charts/GaugeChart.svelte';
  import Progress from '$lib/ui/feedback/Progress.svelte';
  import { stats } from '$lib/stores/core';

  const usedBytes = $derived($stats?.mem_used ?? 0);
  const totalBytes = $derived($stats?.mem_total ?? 1);
  const ramPercent = $derived(totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0);

  const swapUsed = $derived($stats?.swap_used ?? 0);
  const swapTotal = $derived($stats?.swap_total ?? 0);
  const swapPercent = $derived(swapTotal > 0 ? (swapUsed / swapTotal) * 100 : 0);

  function formatGB(bytes: number) {
    if (!bytes || bytes <= 0) return '0.00 GB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
</script>

<Card label="RAM" navigable href="/home">
  <div class="ram-content">
    <div class="gauge-box">
      <GaugeChart
        value={ramPercent}
        size={150}
        sublabel={formatGB(usedBytes)}
      />
    </div>

    <div class="metrics-footer">
      <div class="ram-info">
        <span class="ram-label">Swap Memory</span>
        <span class="ram-val">{formatGB(swapUsed)} / {formatGB(swapTotal)}</span>
      </div>
      <Progress value={swapPercent} height="thin" />
    </div>
  </div>
</Card>

<style>
  .ram-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    gap: var(--space-3);
  }

  .gauge-box {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) 0;
  }

  .metrics-footer {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ram-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-xs);
  }

  .ram-label {
    color: var(--text-secondary);
  }

  .ram-val {
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-weight: 600;
  }
</style>
