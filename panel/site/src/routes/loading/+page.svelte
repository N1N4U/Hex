<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import logoUrl from '$lib/assects/logo.svg';

  let action = $derived($page.url.searchParams.get('action') || 'default');

  onMount(() => {
    // Hold loading screen for 1 step (1.3s) before transitioning
    const timer = setTimeout(() => {
      if (action === 'logout') {
        goto('/lockscreen');
      } else {
        goto('/home');
      }
    }, 1300);

    return () => clearTimeout(timer);
  });
</script>

<div class="loading-screen">
  <div class="logo-box">
    <img src={logoUrl} alt="Hex" class="hex-logo" />
  </div>
</div>

<style>
  .loading-screen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    overflow: hidden;
  }

  .logo-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hex-logo {
    width: 44px;
    height: 44px;
    animation: hex-stepped-rotate 7.5s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    transform-origin: center center;
    user-select: none;
    pointer-events: none;
  }

  @keyframes hex-stepped-rotate {
    0% { transform: rotate(0deg); }
    3.33% { transform: rotate(60deg); }
    16.66% { transform: rotate(60deg); }

    20% { transform: rotate(120deg); }
    33.33% { transform: rotate(120deg); }

    36.66% { transform: rotate(180deg); }
    50% { transform: rotate(180deg); }

    53.33% { transform: rotate(240deg); }
    66.66% { transform: rotate(240deg); }

    70% { transform: rotate(300deg); }
    83.33% { transform: rotate(300deg); }

    86.66% { transform: rotate(360deg); }
    100% { transform: rotate(360deg); }
  }
</style>
