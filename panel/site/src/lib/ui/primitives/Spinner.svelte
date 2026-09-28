<script lang="ts">
  let {
    size = 'md',
    color = 'var(--accent)'
  }: {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
  } = $props();

  const pxSize = $derived({
    sm: '14px',
    md: '20px',
    lg: '32px'
  }[size]);
</script>

<div
  class="spinner"
  style="--spinner-size: {pxSize}; --spinner-color: {color};"
  aria-label="Loading"
></div>

<style>
  .spinner {
    width: var(--spinner-size);
    height: var(--spinner-size);
    border: 2px solid transparent;
    border-top: 2px solid var(--spinner-color);
    border-radius: 50%;
    animation: spin 600ms linear infinite;
    display: inline-block;
    flex-shrink: 0;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
