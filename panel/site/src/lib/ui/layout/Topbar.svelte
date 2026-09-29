<script lang="ts">
  import { Settings, User as UserIcon } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { getPublicConfig } from '$lib/api/auth';
  import { openDialog } from '../overlay/dialogStore.svelte';
  import ProfileDialog from '$lib/pages/profile/ProfileDialog.svelte';
  import UserSettingsDialog from '$lib/pages/settings/UserSettingsDialog.svelte';
  import { nodeStore, loadNodes } from '$lib/stores/node.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';

  let {
    panelName = "Nandu's Panel"
  }: {
    panelName?: string;
  } = $props();

  let livePanelName = $state(panelName);

  onMount(async () => {
    try {
      const cfg = await getPublicConfig();
      if (cfg?.panel_name) {
        livePanelName = cfg.panel_name;
      }
    } catch {}
    await loadNodes();
  });

  function openUserSettings() {
    openDialog(UserSettingsDialog);
  }

  function openProfile() {
    openDialog(ProfileDialog);
  }

  function handleSelectCore(id: string) {
    nodeStore.setActive(id);
    const target = nodeStore.nodes.find((n) => n.id === id);
    if (target) {
      addToast(`Active Core: ${target.name}`, 'info');
    }
  }
</script>

<header class="topbar">
  <!-- Left Side: Big Panel Name + Cores Pill List aligned left-to-right -->
  <div class="topbar-left">
    <span class="brand-name">{livePanelName}</span>

    <div class="cores-pill-list">
      {#each nodeStore.nodes as core (core.id)}
        {@const isOnline = core.status === 'online'}
        {@const isActive = nodeStore.activeId === core.id}
        <button
          type="button"
          class="core-pill-box"
          class:is-active={isActive}
          onclick={() => handleSelectCore(core.id)}
          title="{core.name} ({core.ip_address}) - {isOnline ? 'Connected' : 'Offline'}"
        >
          <span class="core-dot" class:is-online={isOnline}></span>
          <span class="core-name">{core.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Right Side: User Settings & Account Area -->
  <div class="topbar-right">
    <!-- User Settings (Wallpaper change, client side preferences) -->
    <button
      type="button"
      class="circle-action-btn"
      onclick={openUserSettings}
      title="User Settings (Wallpaper & Preferences)"
      aria-label="User Settings"
    >
      <Settings size={18} />
    </button>

    <!-- Account Details (Role, password change & logout) -->
    <button
      type="button"
      class="circle-action-btn"
      onclick={openProfile}
      title="Account Details & Sign Out"
      aria-label="Account Details"
    >
      <UserIcon size={18} />
    </button>
  </div>
</header>

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 60px;
    z-index: 40;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    user-select: none;
    box-sizing: border-box;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  /* Big Panel Name text per user spec */
  .brand-name {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
  }

  /* Cores pill list between panel name and right settings */
  .cores-pill-list {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .core-pill-box {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 12px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
    white-space: nowrap;
  }

  .core-pill-box:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    color: #ffffff;
  }

  .core-pill-box.is-active {
    border-color: rgba(34, 197, 94, 0.45);
    background: rgba(34, 197, 94, 0.08);
    color: #ffffff;
  }

  /* Core status dot: solid color, strictly NO glow per user request */
  .core-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #64748b;
    box-shadow: none !important; /* NO GLOW */
    flex-shrink: 0;
  }

  .core-dot.is-online {
    background: #22c55e;
    box-shadow: none !important; /* NO GLOW */
  }

  .core-name {
    line-height: 1;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .circle-action-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(20, 24, 32, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
    cursor: pointer;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: background 150ms ease, color 150ms ease, border-color 150ms ease, transform 100ms ease;
    padding: 0;
    outline: none;
  }

  .circle-action-btn:hover {
    background: rgba(30, 36, 48, 0.9);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.35);
  }

  .circle-action-btn:active {
    transform: scale(0.96);
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 0 16px;
      height: 54px;
    }
    .brand-name {
      font-size: 20px;
    }
    .cores-pill-list {
      display: none;
    }
    .circle-action-btn {
      width: 34px;
      height: 34px;
    }
  }
</style>
