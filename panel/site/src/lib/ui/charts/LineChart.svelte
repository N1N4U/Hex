<script lang="ts">
  let {
    series = [],
    maxPoints = 60,
    height = 80,
    showGrid = true,
    showLegend = false
  }: {
    series: Array<{
      name: string;
      color: string;
      data: number[];
    }>;
    maxPoints?: number;
    height?: number;
    showGrid?: boolean;
    showLegend?: boolean;
  } = $props();

  const width = 300; // SVG coordinate width

  // Compute global max for scaling
  const maxValue = $derived(() => {
    let max = 1;
    for (const s of series) {
      for (const v of s.data) {
        if (v > max) max = v;
      }
    }
    return max * 1.15; // 15% headroom
  });

  function getBezierPath(points: number[], max: number): { line: string; area: string } {
    if (!points || points.length === 0) return { line: '', area: '' };

    const pts = points.slice(-maxPoints);
    const n = pts.length;
    const stepX = width / Math.max(1, maxPoints - 1);
    const startX = width - (n - 1) * stepX;

    const coords = pts.map((val, i) => {
      const x = startX + i * stepX;
      const y = height - (val / max) * (height - 8) - 4;
      return [x, Math.max(4, Math.min(height - 4, y))];
    });

    if (coords.length === 1) {
      return {
        line: `M ${coords[0][0]} ${coords[0][1]}`,
        area: ''
      };
    }

    let d = `M ${coords[0][0]} ${coords[0][1]}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const [x0, y0] = coords[i];
      const [x1, y1] = coords[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }

    const firstX = coords[0][0];
    const lastX = coords[coords.length - 1][0];
    const area = `${d} L ${lastX} ${height} L ${firstX} ${height} Z`;

    return { line: d, area };
  }
</script>

<div class="line-chart-container">
  <svg
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="none"
    class="line-chart-svg"
    style="height: {height}px;"
  >
    <defs>
      {#each series as s, idx}
        <linearGradient id="grad-{idx}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={s.color} stop-opacity="0.18" />
          <stop offset="100%" stop-color={s.color} stop-opacity="0.0" />
        </linearGradient>
      {/each}
    </defs>

    {#if showGrid}
      <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="var(--chart-grid)" stroke-width="1" />
      <line x1="0" y1={height * 0.50} x2={width} y2={height * 0.50} stroke="var(--chart-grid)" stroke-width="1" />
      <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="var(--chart-grid)" stroke-width="1" />
    {/if}

    {#each series as s, idx}
      {@const max = maxValue()}
      {@const pathData = getBezierPath(s.data, max)}
      {#if pathData.area}
        <path d={pathData.area} fill="url(#grad-{idx})" />
      {/if}
      {#if pathData.line}
        <path
          d={pathData.line}
          fill="none"
          stroke={s.color}
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}
    {/each}
  </svg>

  {#if showLegend}
    <div class="chart-legend">
      {#each series as s}
        <div class="legend-item">
          <span class="legend-dot" style="background-color: {s.color};"></span>
          <span class="legend-label">{s.name}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .line-chart-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;
  }

  .line-chart-svg {
    width: 100%;
    overflow: visible;
  }

  .chart-legend {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-top: var(--space-2);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
</style>
