<script lang="ts">
  let {
    value = 0,
    color = 'var(--accent)',
    height = 'normal',
    animated = false,
    showLabel = false
  }: {
    value: number;
    color?: string;
    height?: 'thin' | 'normal';
    animated?: boolean;
    showLabel?: boolean;
  } = $props();

  const clamped = $derived(Math.min(100, Math.max(0, value)));

  // Critical > 90% = red, Warning > 70% = amber, normal = color prop
  const actualColor = $derived(
    clamped >= 90 ? 'var(--danger)' : clamped >= 70 ? 'var(--amber)' : color
  );
</script>

<div class="progress-container">
  <div class="progress-track {height}">
    <div
      class="progress-fill"
      class:is-animated={animated}
      style="width: {clamped}%; background-color: {actualColor};"
    ></div>
  </div>

  {#if showLabel}
    <span class="progress-label" style="color: {actualColor};">
      {clamped.toFixed(0)}%
    </span>
  {/if}
</div>

<style>
  .progress-container {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
  }

  .progress-track {
    flex: 1;
    background: var(--gauge-track);
    border-radius: var(--radius-full);
    overflow: hidden;
    position: relative;
  }

  .progress-track.thin {
    height: 3px;
  }

  .progress-track.normal {
    height: 6px;
  }

  .progress-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 400ms ease, background-color 200ms ease;
  }

  .progress-fill.is-animated {
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.25) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .progress-label {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    font-weight: 500;
    min-width: 32px;
    text-align: right;
  }
</style>
