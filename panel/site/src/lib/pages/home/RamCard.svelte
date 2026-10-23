<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import GaugeChart from '$lib/ui/charts/GaugeChart.svelte';
  import Progress from '$lib/ui/feedback/Progress.svelte';
  import { stats } from '$lib/stores/core';

  let { onclick }: { onclick?: () => void } = $props();

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

  // If under 1 GB, show MB (e.g. 17.75 MB), otherwise show GB
  function formatSwapMem(bytes: number) {
    if (!bytes || bytes <= 0) return '0 MB';
    if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
</script>

<Card label="RAM" navigable {onclick}>
  <div class="ram-content">
    <div class="gauge-container">
      <div class="gauge-box">
        <GaugeChart
          value={ramPercent}
          size={146}
          sublabel={formatGB(usedBytes)}
        />
      </div>
      <!-- Centered total VPS RAM under the arc baseline -->
      <div class="arc-endpoints">
        <span class="endpoint-val highlight font-mono">{formatGB(totalBytes)}</span>
      </div>
    </div>

    <div class="metrics-footer">
      <div class="ram-info">
        <span class="ram-label">Swap Memory</span>
        <span class="ram-val font-mono">{formatSwapMem(swapUsed)} / {formatGB(swapTotal)}</span>
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
    gap: var(--space-2);
  }

  .gauge-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .gauge-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .arc-endpoints {
    width: 146px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: -8px;
  }

  .endpoint-val {
    font-size: 11.5px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .endpoint-val.highlight {
    color: var(--accent);
    font-weight: 600;
  }

  .metrics-footer {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: auto;
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
    font-weight: 600;
  }
</style>