<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Progress from '$lib/ui/feedback/Progress.svelte';

  let action = $derived($page.url.searchParams.get('action') || 'default');
  let progress = $state(15);
  let statusText = $derived(
    action === 'logout'
      ? 'Signing out securely...'
      : action === 'login'
        ? 'Preparing your dashboard...'
        : 'Connecting to Hex...'
  );

  onMount(() => {
    const interval = setInterval(() => {
      progress = Math.min(100, progress + 25);
    }, 150);

    const timer = setTimeout(() => {
      if (action === 'logout') {
        goto('/lockscreen');
      } else {
        goto('/home');
      }
    }, 750);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  });
</script>

<div class="loading-screen">
  <div class="glow-orb"></div>

  <div class="loading-card">
    <div class="hex-logo-wrapper">
      <svg class="hex-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" stroke="var(--accent)" stroke-width="4" fill="rgba(0, 255, 136, 0.04)" />
        <circle cx="50" cy="50" r="14" fill="var(--accent)" />
      </svg>
      <div class="pulse-ring"></div>
    </div>

    <h2 class="loading-title">Hex Panel</h2>
    <p class="loading-subtitle">{statusText}</p>

    <div class="progress-wrapper">
      <Progress value={progress} height="thin" />
    </div>
  </div>
</div>

<style>
  .loading-screen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: radial-gradient(circle at 50% 40%, #151922 0%, #080a0f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    overflow: hidden;
  }

  .glow-orb {
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 255, 136, 0.08) 0%, transparent 70%);
    filter: blur(60px);
    pointer-events: none;
  }

  .loading-card {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-3);
    max-width: 320px;
    width: 100%;
    padding: var(--space-6);
  }

  .hex-logo-wrapper {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-2);
  }

  .hex-logo {
    width: 72px;
    height: 72px;
    filter: drop-shadow(0 0 16px rgba(0, 255, 136, 0.5));
    animation: spin-pulse 3s ease-in-out infinite alternate;
  }

  .pulse-ring {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid rgba(0, 255, 136, 0.3);
    animation: ring-pulse 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
  }

  @keyframes ring-pulse {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  @keyframes spin-pulse {
    0% { transform: scale(0.95); }
    100% { transform: scale(1.05); }
  }

  .loading-title {
    font-size: var(--text-xl);
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text-primary);
  }

  .loading-subtitle {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .progress-wrapper {
    width: 100%;
    margin-top: var(--space-3);
  }
</style>
