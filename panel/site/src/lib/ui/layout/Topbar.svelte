<script lang="ts">
  import { Settings, User as UserIcon } from '@lucide/svelte';
  import { nodeStore, loadNodes } from '$lib/stores/node';
  import { user } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import Tooltip from '../primitives/Tooltip.svelte';
  import Avatar from '../primitives/Avatar.svelte';
  import { goto } from '$app/navigation';
  import { openDialog } from '../overlay/dialogStore';
  import ProfileDialog from '$lib/pages/profile/ProfileDialog.svelte';

  let {
    panelName = "Hex Panel"
  }: {
    panelName?: string;
  } = $props();

  onMount(() => {
    loadNodes();
  });

  function openProfile() {
    openDialog(ProfileDialog);
  }
</script>

<header class="topbar">
  <div class="topbar-left">
    <div class="brand">
      <span class="brand-name">{panelName}</span>
    </div>

    <!-- Multi-node switcher dots -->
    <div class="server-dots">
      {#each nodeStore.nodes as node}
        <Tooltip content="{node.name} ({node.ip_address}) - {node.status}" position="bottom">
          <button
            type="button"
            class="server-dot-btn"
            class:is-active={nodeStore.activeId === node.id}
            onclick={() => nodeStore.setActive(node.id)}
            aria-label="Switch to {node.name}"
          >
            <span
              class="server-dot"
              class:filled={nodeStore.activeId === node.id}
              style="--node-color: {node.color};"
            ></span>
          </button>
        </Tooltip>
      {/each}
    </div>
  </div>

  <div class="topbar-right">
    <button
      type="button"
      class="icon-btn"
      onclick={() => goto('/settings')}
      title="Settings"
      aria-label="Settings"
    >
      <Settings size={18} />
    </button>

    <button
      type="button"
      class="avatar-btn"
      onclick={openProfile}
      title="Account profile"
      aria-label="Profile"
    >
      <Avatar name={$user?.username || 'Admin'} size="sm" online />
    </button>
  </div>
</header>

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 52px;
    z-index: var(--z-topbar);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .brand-name {
    font-size: var(--text-md);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.2px;
  }

  .server-dots {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    padding: 4px 8px;
    border-radius: var(--radius-full);
  }

  .server-dot-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
  }

  .server-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--node-color);
    background: transparent;
    transition: all var(--transition-fast);
  }

  .server-dot.filled {
    background: var(--node-color);
    box-shadow: 0 0 8px var(--node-color);
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .icon-btn:hover {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }

  .avatar-btn {
    display: flex;
    align-items: center;
    border-radius: 50%;
    padding: 2px;
  }
</style>
