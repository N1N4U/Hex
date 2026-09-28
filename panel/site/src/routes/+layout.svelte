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

  onMount(async () => {
    let offStatus: (() => void) | undefined;
    let offStats: (() => void) | undefined;

    try {
      const u = await me();
      if (u) {
        user.set(u);
        if ($page.url.pathname === '/login') {
          goto('/home');
        }
        // Connect WebSocket only when backend is available and user is authenticated
        connect();
        offStatus = on('__status__', (s) => wsStatus.set(s as any));
        offStats = on('stats', (msg: any) => stats.set(msg.data));
      } else {
        if ($page.url.pathname !== '/login') {
          goto('/login');
        }
      }
    } catch {
      if ($page.url.pathname !== '/login') {
        goto('/login');
      }
    }

    return () => {
      if (offStatus) offStatus();
      if (offStats) offStats();
      disconnect();
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
