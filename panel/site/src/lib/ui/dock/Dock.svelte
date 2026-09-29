<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  import homeIcon from '$lib/assects/icons/home.svg';
  import dockerIcon from '$lib/assects/icons/docker.svg';
  import filesIcon from '$lib/assects/icons/files.svg';
  import nginxIcon from '$lib/assects/icons/nginx.svg';
  import firewallIcon from '$lib/assects/icons/firewall.svg';
  import terminalIcon from '$lib/assects/icons/terminal.svg';
  import settingsIcon from '$lib/assects/icons/settings.svg';

  interface DockApp {
    id: string;
    label: string;
    href: string;
    icon: string;
  }

  const apps: DockApp[] = [
    { id: 'home', label: 'Home', href: '/home', icon: homeIcon },
    { id: 'docker', label: 'Docker', href: '/docker', icon: dockerIcon },
    { id: 'files', label: 'Files', href: '/files', icon: filesIcon },
    { id: 'nginx', label: 'Reverse Proxy', href: '/nginx', icon: nginxIcon },
    { id: 'firewall', label: 'Firewall', href: '/firewall', icon: firewallIcon },
    { id: 'terminal', label: 'Terminal', href: '/terminal', icon: terminalIcon },
    { id: 'settings', label: 'Settings', href: '/settings', icon: settingsIcon }
  ];

  let dockRef: HTMLElement | null = null;
  const maxAdditionalSize = 5;

  const activeApp = $derived($page.url.pathname.split('/')[1] || 'home');

  function scaleValue(
    value: number,
    from: [number, number],
    to: [number, number]
  ): number {
    const scale = (to[1] - to[0]) / (from[1] - from[0]);
    const capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
    return capped * scale + to[0];
  }

  function handleAppHover(ev: MouseEvent) {
    if (!dockRef) return;

    const target = ev.currentTarget as HTMLElement;
    if (!target) return;

    const mousePosition = ev.clientX;
    const rect = target.getBoundingClientRect();
    const iconPositionLeft = rect.left;
    const iconWidth = rect.width;

    if (iconWidth === 0) return;

    const cursorDistance = (mousePosition - iconPositionLeft) / iconWidth;
    const offsetPixels = scaleValue(
      cursorDistance,
      [0, 1],
      [maxAdditionalSize * -1, maxAdditionalSize]
    );

    dockRef.style.setProperty(
      "--dock-offset-left",
      `${offsetPixels * -1}px`
    );

    dockRef.style.setProperty(
      "--dock-offset-right",
      `${offsetPixels}px`
    );
  }

  function handleMouseLeave() {
    if (!dockRef) return;
    dockRef.style.setProperty("--dock-offset-left", "0px");
    dockRef.style.setProperty("--dock-offset-right", "0px");
  }

  function navigateTo(href: string) {
    goto(href);
  }
</script>

<nav
  class="dock-container"
  aria-label="Application Dock"
>
  <div
    class="dock"
    bind:this={dockRef}
    onmouseleave={handleMouseLeave}
    role="toolbar"
  >
    <ul class="dock-list">
      {#each apps as app (app.id)}
        {@const isActive = activeApp === app.id}
        <li
          class="app"
          class:is-active={isActive}
          onmousemove={handleAppHover}
        >
          <button
            type="button"
            class="app-link"
            onclick={() => navigateTo(app.href)}
            aria-label={app.label}
          >
            <div class="icon-frame">
              <img src={app.icon} alt={app.label} class="app-icon" draggable="false" />
            </div>
            <span class="tooltip">{app.label}</span>
          </button>

          {#if isActive}
            <span class="active-indicator" aria-hidden="true"></span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</nav>

<style>
  .dock-container {
    position: fixed;
    bottom: 28px;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 50;
    pointer-events: none;
    user-select: none;
  }

  .dock {
    pointer-events: auto;
    border-radius: 20px;
    padding: 6px 10px;
    background: rgba(18, 22, 30, 0.75);
    background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 12px 32px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .dock-list {
    display: flex;
    align-items: flex-end;
    list-style: none;
    padding: 0;
    margin: 0;
    gap: 6px;
  }

  .app {
    width: 52px;
    height: 52px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    transition: width 100ms cubic-bezier(0.25, 1, 0.5, 1),
                height 100ms cubic-bezier(0.25, 1, 0.5, 1),
                margin-top 100ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  /* Magnification for hovered item */
  .app:hover {
    width: 76px;
    height: 76px;
    margin-top: -24px;
  }

  /* Right-side immediate neighbor */
  .app:hover + .app {
    width: calc(64px + var(--dock-offset-right, 0px));
    height: calc(64px + var(--dock-offset-right, 0px));
    margin-top: calc(-12px + var(--dock-offset-right, 0px) * -1);
  }

  /* Right-side secondary neighbor */
  .app:hover + .app + .app {
    width: calc(56px + var(--dock-offset-right, 0px));
    height: calc(56px + var(--dock-offset-right, 0px));
    margin-top: calc(-4px + var(--dock-offset-right, 0px) * -1);
  }

  /* Left-side immediate neighbor */
  .app:has(+ .app:hover) {
    width: calc(64px + var(--dock-offset-left, 0px));
    height: calc(64px + var(--dock-offset-left, 0px));
    margin-top: calc(-12px + var(--dock-offset-left, 0px) * -1);
  }

  /* Left-side secondary neighbor */
  .app:has(+ .app + .app:hover) {
    width: calc(56px + var(--dock-offset-left, 0px));
    height: calc(56px + var(--dock-offset-left, 0px));
    margin-top: calc(-4px + var(--dock-offset-left, 0px) * -1);
  }

  .app-link {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    position: relative;
    outline: none;
  }

  .icon-frame {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    transition: transform 120ms ease;
  }

  .app-icon {
    width: 86%;
    height: 86%;
    object-fit: contain;
    transition: filter 180ms ease, transform 120ms ease;
    filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.35));
  }

  /* Active state: light white / grey icon matching macOS style */
  .app.is-active .app-icon {
    filter: brightness(0) invert(0.92) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
  }

  /* Inactive state: full colorful SVG as requested */
  .app:not(.is-active) .app-icon {
    /* Colorful SVG unchanged */
  }

  /* Active indicator dot */
  .active-indicator {
    position: absolute;
    bottom: -6px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
  }

  /* Tooltip */
  .app:hover .tooltip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }

  .tooltip {
    position: absolute;
    top: -36px;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease, transform 120ms ease;
    background: rgba(15, 18, 24, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
    color: #f1f5f9;
    font-size: 11px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 8px;
    white-space: nowrap;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .dock-container {
      bottom: 24px;
    }

    .dock {
      padding: 4px 6px;
      border-radius: 16px;
      max-width: 95vw;
      overflow-x: auto;
    }

    .dock-list {
      gap: 4px;
    }

    .app {
      width: 40px;
      height: 40px;
    }

    /* Disable heavy magnification on mobile touch */
    .app:hover {
      width: 40px;
      height: 40px;
      margin-top: 0;
    }

    .app:hover + .app,
    .app:has(+ .app:hover),
    .app:hover + .app + .app,
    .app:has(+ .app + .app:hover) {
      width: 40px;
      height: 40px;
      margin-top: 0;
    }

    .tooltip {
      display: none;
    }
  }
</style>
