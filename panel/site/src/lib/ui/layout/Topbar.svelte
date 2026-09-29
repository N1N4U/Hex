<script lang="ts">
  import { Settings, User as UserIcon } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { getPublicConfig } from '$lib/api/auth';
  import { goto } from '$app/navigation';
  import { openDialog } from '../overlay/dialogStore.svelte';
  import ProfileDialog from '$lib/pages/profile/ProfileDialog.svelte';

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
  });

  function openProfile() {
    openDialog(ProfileDialog);
  }
</script>

<header class="topbar">
  <div class="topbar-left">
    <span class="brand-name">{livePanelName}</span>
  </div>

  <div class="topbar-right">
    <!-- Settings icon for personalized settings -->
    <button
      type="button"
      class="circle-action-btn"
      onclick={() => goto('/settings')}
      title="Personalized Settings"
      aria-label="Settings"
    >
      <Settings size={18} />
    </button>

    <!-- Account Details (opens dialog with user details & logout) -->
    <button
      type="button"
      class="circle-action-btn"
      onclick={openProfile}
      title="Account details & Logout"
      aria-label="Account"
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
    height: 58px;
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
  }

  .brand-name {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.3px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Circular buttons matching user reference screenshot */
  .circle-action-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(20, 24, 32, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
    cursor: pointer;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
    padding: 0;
    outline: none;
  }

  .circle-action-btn:hover {
    background: rgba(30, 36, 48, 0.85);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
  }

  .circle-action-btn:active {
    transform: scale(0.96);
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 0 16px;
      height: 52px;
    }
    .brand-name {
      font-size: 18px;
    }
    .circle-action-btn {
      width: 34px;
      height: 34px;
    }
  }
</style>
