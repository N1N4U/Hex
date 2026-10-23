<script lang="ts">
  let {
    series = [],
    maxPoints = 30,
    height = 120,
    showGrid = true,
    showLegend = true,
    formatY
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
    formatY?: (val: number) => string;
  } = $props();

  const width = 360;

  function defaultFormat(val: number): string {
    if (formatY) return formatY(val);
    if (val <= 0) return '0 B/s';
    if (val < 1024) return Math.round(val) + ' B/s';
    if (val < 1024 * 1024) return (val / 1024).toFixed(1) + ' KB/s';
    return (val / (1024 * 1024)).toFixed(1) + ' MB/s';
  }

  // Derive maximum value from current series data
  const peakValue = $derived.by(() => {
    let max = 1024; // baseline 1 KB/s minimum scale
    for (const s of series) {
      if (s.data) {
        for (const v of s.data) {
          if (typeof v === 'number' && v > max) max = v;
        }
      }
    }
    return max * 1.15; // 15% headroom
  });

  function getBezierPath(points: number[], max: number): { line: string; area: string } {
    if (!points || points.length === 0) return { line: '', area: '' };

    const pts = points.slice(-maxPoints);
    const n = pts.length;
    const stepX = width / Math.max(1, n - 1);

    const coords = pts.map((val, i) => {
      const x = i * stepX;
      const safeVal = Math.max(0, val || 0);
      const y = height - (safeVal / max) * (height - 18) - 6;
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
  <div class="chart-wrapper">
    <!-- SVG Chart Canvas -->
    <svg
      viewBox="0 0 {width} {height}"
      preserveAspectRatio="none"
      class="line-chart-svg"
      style="height: {height}px;"
    >
      <defs>
        {#each series as s, idx}
          <linearGradient id="chart-grad-{idx}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color={s.color} stop-opacity="0.25" />
            <stop offset="100%" stop-color={s.color} stop-opacity="0.0" />
          </linearGradient>
        {/each}
      </defs>

      {#if showGrid}
        <!-- Grid lines across width -->
        <line x1="0" y1={height * 0.12} x2={width} y2={height * 0.12} stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="0" y1={height * 0.52} x2={width} y2={height * 0.52} stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="0" y1={height - 2} x2={width} y2={height - 2} stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      {/if}

      {#each series as s, idx}
        {@const pathData = getBezierPath(s.data, peakValue)}
        {#if pathData.area}
          <path d={pathData.area} fill="url(#chart-grad-{idx})" />
        {/if}
        {#if pathData.line}
          <path
            d={pathData.line}
            fill="none"
            stroke={s.color}
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}
      {/each}
    </svg>

    <!-- Overlay Grid Labels: Clean, right-aligned, sleek typography without clunky box backgrounds -->
    {#if showGrid}
      <div class="grid-labels">
        <span class="y-label top">{defaultFormat(peakValue)}</span>
        <span class="y-label mid">{defaultFormat(peakValue * 0.5)}</span>
        <span class="y-label btm">0 B/s</span>
      </div>
    {/if}
  </div>

  {#if showLegend}
    <div class="chart-legend">
      {#each series as s}
        {@const latestVal = s.data && s.data.length > 0 ? s.data[s.data.length - 1] : 0}
        <div class="legend-item">
          <span class="legend-dot" style="background-color: {s.color};"></span>
          <span class="legend-label">{s.name}</span>
          <span class="legend-val font-mono" style="color: {s.color};">{defaultFormat(latestVal)}</span>
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
    position: relative;
    user-select: none;
  }

  .chart-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: var(--radius-sm);
  }

  .line-chart-svg {
    width: 100%;
    display: block;
    overflow: visible;
  }

  .grid-labels {
    position: absolute;
    top: 2px;
    right: 8px;
    bottom: 4px;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
  }

  .y-label {
    font-size: 10px;
    font-family: var(--font-mono);
    color: rgba(255, 255, 255, 0.32);
    background: transparent;
    padding: 0;
    line-height: 1;
    font-weight: 500;
  }

  .chart-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-2);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-xs);
  }

  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .legend-label {
    color: var(--text-secondary);
  }

  .legend-val {
    font-size: 11px;
    font-weight: 600;
  }
</style>
