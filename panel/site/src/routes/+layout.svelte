<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import Toast from '$lib/ui/feedback/Toast.svelte';
  import { user } from '$lib/stores/auth';
  import { me } from '$lib/api/auth';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { connect, disconnect, on } from '$lib/ws/client';
  import { stats, wsStatus } from '$lib/stores/core';
  import { dialogStore } from '$lib/ui/overlay/dialogStore.svelte';

  let { children }: { children?: Snippet } = $props();

  import { nodeStore, loadNodes } from '$lib/stores/node.svelte';

  let cleanupWs: (() => void) | null = null;

  function setupLiveConnection() {
    if (cleanupWs) return;
    loadNodes();
    connect();
    const offStatus = on('__status__', (s) => wsStatus.set(s as any));
    const offStats = on('stats.update', (data: any) => {
      if (data) stats.set(data);
    });
    cleanupWs = () => {
      offStatus();
      offStats();
      disconnect();
      cleanupWs = null;
    };
  }

  // React to login / logout state immediately without needing a browser refresh
  const unsubUser = user.subscribe((currentUser) => {
    if (currentUser) {
      setupLiveConnection();
    } else {
      if (cleanupWs) cleanupWs();
    }
  });

  onMount(async () => {
    const publicRoutes = ['/lockscreen', '/login', '/loading'];

    try {
      const u = await me();
      if (u) {
        user.set(u);
        if ($page.url.pathname === '/lockscreen' || $page.url.pathname === '/login') {
          goto('/home');
        }
      } else {
        if (!publicRoutes.includes($page.url.pathname)) {
          goto('/lockscreen');
        }
      }
    } catch {
      if (!publicRoutes.includes($page.url.pathname)) {
        goto('/lockscreen');
      }
    }

    return () => {
      unsubUser();
      if (cleanupWs) cleanupWs();
    };
  });
</script>

<Toast />

{#if dialogStore.current}
  {@const CurrentDialog = dialogStore.current.component}
  <CurrentDialog {...dialogStore.current.props} />
{/if}

{#if children}
  {@render children()}
{/if}
