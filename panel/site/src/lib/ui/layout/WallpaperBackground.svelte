<script lang="ts">
  import { wallpaperStore } from '$lib/stores/wallpaper.svelte';

  let {
    blur = 0,
    tint = undefined
  }: {
    blur?: number;
    tint?: number;
  } = $props();

  const activeTint = $derived(tint !== undefined ? tint : wallpaperStore.tint);
  const activeBlur = $derived(blur > 0 ? blur : wallpaperStore.blur);
</script>

<div class="wallpaper-container">
  <img
    src={wallpaperStore.url}
    alt="Wallpaper"
    class="wallpaper-img"
    style="filter: blur({activeBlur}px); transform: {activeBlur > 0 ? 'scale(1.06)' : 'scale(1)'};"
  />
  <div
    class="wallpaper-tint"
    style="opacity: {activeTint};"
  ></div>
</div>

<style>
  .wallpaper-container {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  .wallpaper-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: filter 0.4s ease, transform 0.4s ease;
    will-change: filter, transform;
  }

  .wallpaper-tint {
    position: absolute;
    inset: 0;
    background-color: #000000;
    transition: opacity 0.3s ease;
  }
</style>
