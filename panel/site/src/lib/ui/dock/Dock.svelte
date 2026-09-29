<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  import homeIcon from '$lib/assects/icons/home.svg';
  import dockerIcon from '$lib/assects/icons/docker.svg';
  import filesIcon from '$lib/assects/icons/files.svg';
  import nginxIcon from '$lib/assects/icons/nginx.svg';
  import firewallIcon from '$lib/assects/icons/firewall.svg';
  import terminalIcon from '$lib/assects/icons/terminal.svg';
  import coreIcon from '$lib/assects/icons/core.svg';
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
    { id: 'core', label: 'Core', href: '/core', icon: coreIcon },
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
    tabindex="0"
    aria-label="Application dock"
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
            <div class="circle-btn">
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

  /* Dock background matching user reference image: deep dark rounded pill */
  .dock {
    pointer-events: auto;
    border-radius: 9999px;
    padding: 6px 12px;
    background: rgba(10, 12, 16, 0.88);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      0 16px 36px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.08);
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
    width: 48px;
    height: 48px;
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
    width: 68px;
    height: 68px;
    margin-top: -20px;
  }

  /* Right-side immediate neighbor */
  .app:hover + .app {
    width: calc(58px + var(--dock-offset-right, 0px));
    height: calc(58px + var(--dock-offset-right, 0px));
    margin-top: calc(-10px + var(--dock-offset-right, 0px) * -1);
  }

  /* Right-side secondary neighbor */
  .app:hover + .app + .app {
    width: calc(52px + var(--dock-offset-right, 0px));
    height: calc(52px + var(--dock-offset-right, 0px));
    margin-top: calc(-4px + var(--dock-offset-right, 0px) * -1);
  }

  /* Left-side immediate neighbor */
  .app:has(+ .app:hover) {
    width: calc(58px + var(--dock-offset-left, 0px));
    height: calc(58px + var(--dock-offset-left, 0px));
    margin-top: calc(-10px + var(--dock-offset-left, 0px) * -1);
  }

  /* Left-side secondary neighbor */
  .app:has(+ .app + .app:hover) {
    width: calc(52px + var(--dock-offset-left, 0px));
    height: calc(52px + var(--dock-offset-left, 0px));
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

  /* Circular dark button container matching user image */
  .circle-btn {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    transition: background 150ms ease, border-color 150ms ease;
  }

  .app:hover .circle-btn {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.16);
  }

  .app.is-active .circle-btn {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.14);
  }

  /* Standalone vector glyph icon */
  .app-icon {
    width: 52%;
    height: 52%;
    object-fit: contain;
    transition: transform 120ms ease;
  }

  /* Active indicator dot matching screenshot: centered dot underneath */
  .active-indicator {
    position: absolute;
    bottom: -6px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.85);
  }

  /* Tooltip */
  .app:hover .tooltip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }

  .tooltip {
    position: absolute;
    top: -34px;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease, transform 120ms ease;
    background: rgba(10, 12, 16, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
    color: #f1f5f9;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 7px;
    white-space: nowrap;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  /* Mobile responsiveness: Big dock filling the length, right above bottom footer */
  @media (max-width: 640px) {
    .dock-container {
      bottom: 26px;
      left: 0;
      right: 0;
      width: 100%;
      padding: 0 8px;
      box-sizing: border-box;
    }

    .dock {
      width: 100%;
      max-width: 100%;
      padding: 6px 6px;
      border-radius: 16px;
      box-sizing: border-box;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.14);
    }

    .dock-list {
      width: 100%;
      display: flex;
      justify-content: space-around;
      align-items: center;
      gap: 0;
    }

    .app {
      width: 40px;
      height: 40px;
      flex: 1;
      max-width: 44px;
    }

    .circle-btn {
      width: 36px;
      height: 36px;
    }

    .app-icon {
      width: 58%;
      height: 58%;
    }

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
