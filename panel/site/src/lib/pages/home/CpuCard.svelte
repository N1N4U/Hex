<script lang="ts">
  import Card from '$lib/ui/layout/Card.svelte';
  import GaugeChart from '$lib/ui/charts/GaugeChart.svelte';
  import Progress from '$lib/ui/feedback/Progress.svelte';
  import { stats } from '$lib/stores/core';

  const cpuPercent = $derived($stats?.cpu_percent ?? 0);
  const cpuCores = $derived($stats?.cpu_cores ?? 2);
  const cpuModel = $derived($stats?.cpu_model ?? 'Virtual CPU');
</script>

<Card label="CPU" navigable href="/home">
  <div class="cpu-content">
    <div class="gauge-box">
      <GaugeChart
        value={cpuPercent}
        size={150}
        sublabel="{cpuCores} Cores"
      />
    </div>

    <div class="metrics-footer">
      <div class="core-info">
        <span class="cpu-name">{cpuModel}</span>
        <span class="cpu-val">{cpuPercent.toFixed(1)}%</span>
      </div>
      <Progress value={cpuPercent} height="thin" />
    </div>
  </div>
</Card>

<style>
  .cpu-content {
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

  .core-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-xs);
  }

  .cpu-name {
    color: var(--text-secondary);
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cpu-val {
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-weight: 600;
  }
</style>
