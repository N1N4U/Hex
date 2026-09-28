<script lang="ts">
  let {
    value = 0,
    size = 160,
    strokeWidth = 10,
    label = '',
    sublabel = '',
    color = 'var(--accent)',
    animateDuration = 800
  }: {
    value: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
    sublabel?: string;
    color?: string;
    animateDuration?: number;
  } = $props();

  const clamped = $derived(Math.min(100, Math.max(0, value)));
  const center = $derived(size / 2);
  const radius = $derived((size - strokeWidth) / 2);
  const circumference = $derived(2 * Math.PI * radius);
  const totalArcLength = $derived(0.75 * circumference); // 270 degrees sweep

  const strokeDashoffset = $derived(
    totalArcLength - (clamped / 100) * totalArcLength
  );

  const displayColor = $derived(
    clamped >= 90 ? 'var(--danger)' : clamped >= 70 ? 'var(--amber)' : color
  );
</script>

<div class="gauge-wrapper" style="width: {size}px; height: {size}px;">
  <svg
    width={size}
    height={size}
    viewBox="0 0 {size} {size}"
    class="gauge-svg"
  >
    <!-- Background track arc (270 degrees) -->
    <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke="var(--gauge-track)"
      stroke-width={strokeWidth}
      stroke-dasharray="{totalArcLength} {circumference}"
      stroke-linecap="round"
      transform="rotate(135 {center} {center})"
    />

    <!-- Filled value arc -->
    <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={displayColor}
      stroke-width={strokeWidth}
      stroke-dasharray="{totalArcLength} {circumference}"
      stroke-dashoffset={strokeDashoffset}
      stroke-linecap="round"
      transform="rotate(135 {center} {center})"
      style="transition: stroke-dashoffset {animateDuration}ms cubic-bezier(0.16, 1, 0.3, 1), stroke 200ms ease;"
    />
  </svg>

  <div class="gauge-center-content">
    <div class="gauge-value" style="color: {displayColor};">
      {label || `${clamped.toFixed(1)}%`}
    </div>
    {#if sublabel}
      <div class="gauge-sublabel">{sublabel}</div>
    {/if}
  </div>
</div>

<style>
  .gauge-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .gauge-svg {
    position: absolute;
    inset: 0;
  }

  .gauge-center-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1;
    text-align: center;
    padding-top: 10px;
  }

  .gauge-value {
    font-size: var(--text-xl);
    font-weight: 700;
    font-family: var(--font-sans);
    line-height: 1.1;
    transition: color 200ms ease;
  }

  .gauge-sublabel {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-top: 4px;
    font-family: var(--font-mono);
  }
</style>
