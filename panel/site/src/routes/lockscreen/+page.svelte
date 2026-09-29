<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { ChevronUp } from '@lucide/svelte';
  import WallpaperBackground from '$lib/ui/layout/WallpaperBackground.svelte';

  let timeStr = $state('');
  let ampmStr = $state('');
  let dateStr = $state('');

  // Drag / swipe detection
  let startY = 0;
  let isDragging = false;

  onMount(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      const hoursStr = hours.toString().padStart(2, '0');

      timeStr = `${hoursStr}:${minutes}`;
      ampmStr = ampm;
      dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        unlock();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  function unlock() {
    goto('/login');
  }

  function handleTouchStart(e: TouchEvent) {
    startY = e.touches[0].clientY;
    isDragging = true;
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!isDragging) return;
    const endY = e.changedTouches[0].clientY;
    if (startY - endY > 40) {
      unlock();
    } else {
      unlock();
    }
    isDragging = false;
  }

  function handleMouseDown(e: MouseEvent) {
    startY = e.clientY;
    isDragging = true;
  }

  function handleMouseUp(e: MouseEvent) {
    if (!isDragging) return;
    unlock();
    isDragging = false;
  }
</script>

<div
  class="lockscreen-root"
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  onmousedown={handleMouseDown}
  onmouseup={handleMouseUp}
  role="region"
  aria-label="Lock Screen"
>
  <WallpaperBackground blur={0} />

  <div class="lockscreen-content">
    <!-- Middle-upper Clock & Date -->
    <div class="clock-panel">
      <div class="time-row">
        <span class="time-val">{timeStr || '12:00'}</span>
        <span class="ampm-val">{ampmStr || 'AM'}</span>
      </div>
      <p class="date-val">{dateStr || 'Loading...'}</p>
    </div>

    <!-- Bottom prompt -->
    <div class="unlock-prompt">
      <div class="chevron-bounce">
        <ChevronUp size={24} />
      </div>
      <span class="prompt-text">Click anywhere or swipe up to unlock</span>
    </div>
  </div>
</div>

<style>
  .lockscreen-root {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    user-select: none;
    cursor: pointer;
    font-family: var(--font-sans);
  }

  .lockscreen-content {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding-top: 18vh;
    padding-bottom: 6vh;
    box-sizing: border-box;
  }

  .clock-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
  }

  .time-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .time-val {
    font-size: clamp(68px, 10vw, 104px);
    font-weight: 300;
    letter-spacing: -2px;
    color: #ffffff;
    line-height: 1;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  .ampm-val {
    font-size: clamp(20px, 2.5vw, 32px);
    font-weight: 500;
    color: #e2e8f0;
    letter-spacing: 1px;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  }

  .date-val {
    font-size: clamp(16px, 1.8vw, 22px);
    font-weight: 400;
    color: #cbd5e1;
    letter-spacing: 0.2px;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  }

  .unlock-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #cbd5e1;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  }

  .chevron-bounce {
    animation: chevron-pulse 2s infinite ease-in-out;
  }

  @keyframes chevron-pulse {
    0%, 100% { transform: translateY(0); opacity: 0.8; }
    50% { transform: translateY(-8px); opacity: 1; }
  }

  .prompt-text {
    font-size: 14px;
    letter-spacing: 0.3px;
  }
</style>
