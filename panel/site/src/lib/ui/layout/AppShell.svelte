<script lang="ts">
  import type { Snippet } from 'svelte';
  import Topbar from './Topbar.svelte';
  import Dock from '../dock/Dock.svelte';
  import BottomFooter from './BottomFooter.svelte';
  import WallpaperBackground from './WallpaperBackground.svelte';

  let {
    panelName = "Hex Panel",
    children
  }: {
    panelName?: string;
    children?: Snippet;
  } = $props();
</script>

<div class="app-shell">
  <WallpaperBackground />
  <Topbar {panelName} />

  <main class="content-viewport">
    <div class="content-wrapper">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </main>

  <Dock />
  <BottomFooter />
</div>

<style>
  .app-shell {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: transparent;
  }

  .content-viewport {
    position: relative;
    z-index: 10;
    flex: 1;
    overflow-y: auto;
    padding-top: 52px; /* Topbar height */
    padding-bottom: 96px; /* Clearance for Dock and BottomFooter */
    display: flex;
    justify-content: center;
  }

  .content-wrapper {
    width: 100%;
    max-width: 1400px;
    padding: var(--space-5) var(--space-6);
  }
</style>
