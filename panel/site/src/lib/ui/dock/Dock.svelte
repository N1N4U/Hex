<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    Home,
    Box,
    Folder,
    Globe,
    Shield,
    Terminal,
    Settings
  } from '@lucide/svelte';

  const dockApps = [
    { id: 'home', label: 'Home', href: '/home', icon: Home },
    { id: 'docker', label: 'Docker', href: '/docker', icon: Box },
    { id: 'files', label: 'Files', href: '/files', icon: Folder },
    { id: 'nginx', label: 'Reverse Proxy', href: '/nginx', icon: Globe },
    { id: 'firewall', label: 'Firewall', href: '/firewall', icon: Shield },
    { id: 'terminal', label: 'Terminal', href: '/terminal', icon: Terminal },
    { id: 'settings', label: 'Settings', href: '/settings', icon: Settings }
  ];

  let mouseX = $state<number | null>(null);
  let dockRef: HTMLDivElement | null = null;

  const activeApp = $derived($page.url.pathname.split('/')[1] || 'home');

  function handleMouseMove(e: MouseEvent) {
    if (dockRef) {
      const rect = dockRef.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
    }
  }

  function handleMouseLeave() {
    mouseX = null;
  }

  function calculateScale(index: number, total: number): number {
    if (mouseX === null || !dockRef) return 1;

    const baseSize = 42;
    const gap = 8;
    const padding = 12;
    const itemCenter = padding + index * (baseSize + gap) + baseSize / 2;
    const distance = Math.abs(mouseX - itemCenter);
    const maxDistance = 110;

    if (distance > maxDistance) return 1;

    // Magnification scale up to 1.33 (~56px max)
    const factor = Math.cos((distance / maxDistance) * (Math.PI / 2));
    return 1 + 0.33 * Math.max(0, factor);
  }
</script>

<nav class="dock-container">
  <div
    class="dock-pill"
    bind:this={dockRef}
    onmousemove={handleMouseMove}
    onmouseleave={handleMouseLeave}
    role="navigation"
    aria-label="Application dock"
  >
    {#each dockApps as app, index}
      {@const Icon = app.icon}
      {@const scale = calculateScale(index, dockApps.length)}
      {@const isActive = activeApp === app.id}

      <div class="dock-item-wrapper">
        <button
          type="button"
          class="dock-btn"
          class:is-active={isActive}
          style="transform: scale({scale});"
          onclick={() => goto(app.href)}
          title={app.label}
          aria-label={app.label}
        >
          <Icon size={20} class="dock-icon" />
        </button>

        {#if isActive}
          <span class="active-dot"></span>
        {/if}
      </div>
    {/each}
  </div>
</nav>

<style>
  .dock-container {
    position: fixed;
    bottom: var(--space-4);
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: var(--z-dock);
    pointer-events: none;
  }

  .dock-pill {
    pointer-events: auto;
    background: var(--dock-bg);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--dock-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-dock);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
  }

  .dock-item-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .dock-btn {
    width: var(--dock-icon-size);
    height: var(--dock-icon-size);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: transform 120ms ease, background 150ms ease, color 150ms ease;
    background: transparent;
    transform-origin: bottom center;
  }

  .dock-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  .dock-btn.is-active {
    background: rgba(255, 255, 255, 0.1);
    color: var(--accent);
  }

  .active-dot {
    position: absolute;
    bottom: -6px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 4px var(--accent);
  }
</style>
