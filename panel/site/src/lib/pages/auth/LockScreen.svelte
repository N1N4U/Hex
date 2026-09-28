<script lang="ts">
  import { onMount } from 'svelte';
  import { login as apiLogin, me } from '$lib/api/auth';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { ArrowRight, ChevronUp, AlertCircle, X } from '@lucide/svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';

  let { initialUnlocked = false }: { initialUnlocked?: boolean } = $props();

  let isUnlocked = $state(initialUnlocked);
  let timeStr = $state('');
  let dateStr = $state('');

  // Form states
  let username = $state('Administrator');
  let password = $state('');
  let loading = $state(false);
  let errorMsg = $state('');
  let passwordInputRef: HTMLInputElement | null = null;
  let showIssueBadge = $state(true);

  // Drag / swipe detection
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  onMount(() => {
    const updateTime = () => {
      const now = new Date();
      timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleKeydown = (e: KeyboardEvent) => {
      if (!isUnlocked && e.key !== 'Escape') {
        unlock();
      } else if (isUnlocked && e.key === 'Escape') {
        lock();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  function unlock() {
    isUnlocked = true;
    setTimeout(() => {
      passwordInputRef?.focus();
    }, 300);
  }

  function lock() {
    isUnlocked = false;
    errorMsg = '';
    password = '';
  }

  function handleTouchStart(e: TouchEvent) {
    if (isUnlocked) return;
    startY = e.touches[0].clientY;
    isDragging = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging || isUnlocked) return;
    currentY = e.touches[0].clientY;
  }

  function handleTouchEnd() {
    if (!isDragging || isUnlocked) return;
    if (startY - currentY > 60 && currentY !== 0) {
      unlock();
    }
    isDragging = false;
    currentY = 0;
  }

  function handleMouseDown(e: MouseEvent) {
    if (isUnlocked) return;
    startY = e.clientY;
    isDragging = true;
  }

  function handleMouseUp(e: MouseEvent) {
    if (!isDragging || isUnlocked) return;
    if (startY - e.clientY > 50) {
      unlock();
    } else {
      // Simple click also unlocks
      unlock();
    }
    isDragging = false;
  }

  async function handleLoginSubmit() {
    if (!username || !password) {
      errorMsg = 'Please enter your password';
      return;
    }

    loading = true;
    errorMsg = '';

    try {
      const res = await apiLogin(username.trim(), password);
      if (res.ok) {
        const u = await me();
        user.set(u);
        goto('/loading?action=login');
      } else {
        errorMsg = 'Incorrect password';
        password = '';
        passwordInputRef?.focus();
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Login failed. Please check credentials.';
      password = '';
      passwordInputRef?.focus();
    } finally {
      loading = false;
    }
  }

  function handleOAuth(provider: string) {
    addToast(`${provider} login will be available soon. Please use master password.`, 'info');
  }
</script>

<div
  class="lock-container"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  onmousedown={handleMouseDown}
  onmouseup={handleMouseUp}
  role="region"
  aria-label="Hex Lock and Login Screen"
>
  <!-- Background Glow & Vignette -->
  <div class="vignette-bg"></div>
  <div class="ambient-glow"></div>

  <!-- Layer 1: Clock & Date Lockscreen -->
  <div class="lock-layer" class:is-hidden={isUnlocked}>
    <div class="clock-display">
      <h1 class="time-text">{timeStr || '00:00'}</h1>
      <p class="date-text">{dateStr || 'Loading...'}</p>
    </div>

    <div class="swipe-prompt">
      <div class="chevron-bounce">
        <ChevronUp size={24} />
      </div>
      <span class="prompt-text">Click anywhere or swipe up to unlock</span>
    </div>
  </div>

  <!-- Layer 2: Login Screen (Exact visual match to trash/image/login.png) -->
  <div
    class="login-layer"
    class:is-active={isUnlocked}
    onmousedown={(e) => e.stopPropagation()}
    onmouseup={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
  >
    <div class="login-box">
      <!-- Avatar with Purple-to-Magenta Gradient -->
      <div class="avatar-wrapper">
        <div class="avatar-gradient">
          <span class="avatar-initial">{username ? username.charAt(0).toUpperCase() : 'A'}</span>
        </div>
      </div>

      <!-- User Title -->
      <h2 class="user-heading">{username || 'Administrator'}</h2>

      <!-- Form -->
      <form class="login-form" onsubmit={(e) => { e.preventDefault(); handleLoginSubmit(); }}>
        <!-- Username Input -->
        <div class="input-row">
          <input
            type="text"
            class="clean-input"
            placeholder="Username"
            bind:value={username}
            autocomplete="username"
            disabled={loading}
          />
        </div>

        <!-- Password Input with embedded submit arrow -->
        <div class="input-row password-row">
          <input
            type="password"
            class="clean-input"
            placeholder="Password"
            bind:value={password}
            bind:this={passwordInputRef}
            autocomplete="current-password"
            disabled={loading}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLoginSubmit();
              }
            }}
          />
          <button
            type="submit"
            class="submit-arrow-btn"
            disabled={loading || !password}
            aria-label="Submit login"
          >
            {#if loading}
              <span class="mini-spinner"></span>
            {:else}
              <ArrowRight size={16} />
            {/if}
          </button>
        </div>

        {#if errorMsg}
          <div class="error-notice">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        {/if}

        <!-- OAuth / Provider Pills -->
        <div class="oauth-row">
          <button type="button" class="oauth-pill" onclick={() => handleOAuth('Discord')}>
            Discord
          </button>
          <button type="button" class="oauth-pill" onclick={() => handleOAuth('Google')}>
            Google
          </button>
          <button type="button" class="oauth-pill" onclick={() => handleOAuth('Gmail')}>
            Gmail
          </button>
        </div>

        <!-- Cancel Pill Button -->
        <div class="cancel-row">
          <button type="button" class="cancel-pill" onclick={lock}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Bottom Left Badge (Matching image pill) -->
  {#if showIssueBadge}
    <div class="issue-badge-container">
      <div class="issue-pill">
        <span class="badge-icon-circle">N</span>
        <span class="badge-label">Hex Online</span>
        <button
          type="button"
          class="badge-close-btn"
          onclick={() => (showIssueBadge = false)}
          aria-label="Dismiss badge"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .lock-container {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: #0b0d11;
    overflow: hidden;
    user-select: none;
    font-family: var(--font-sans);
  }

  .vignette-bg {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(18, 22, 31, 0.8) 0%, #06080b 100%);
    pointer-events: none;
  }

  .ambient-glow {
    position: absolute;
    width: 600px;
    height: 600px;
    top: 35%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 65%);
    filter: blur(80px);
    pointer-events: none;
  }

  /* Layer 1: Lockscreen Clock */
  .lock-layer {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 12vh 0 6vh;
    z-index: 20;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
    cursor: pointer;
  }

  .lock-layer.is-hidden {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }

  .clock-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }

  .time-text {
    font-size: clamp(64px, 10vw, 108px);
    font-weight: 200;
    letter-spacing: -2px;
    color: #f1f5f9;
    line-height: 1;
    text-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
  }

  .date-text {
    font-size: var(--text-lg);
    font-weight: 400;
    color: #94a3b8;
    letter-spacing: 0.2px;
  }

  .swipe-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #64748b;
  }

  .chevron-bounce {
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-8px); }
    60% { transform: translateY(-4px); }
  }

  .prompt-text {
    font-size: var(--text-sm);
    letter-spacing: 0.3px;
  }

  /* Layer 2: Login Screen */
  .login-layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 30;
    opacity: 0;
    pointer-events: none;
    transform: translateY(40px) scale(0.96);
    transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
  }

  .login-layer.is-active {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0) scale(1);
  }

  .login-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 320px;
    text-align: center;
  }

  /* Circular Avatar */
  .avatar-wrapper {
    margin-bottom: 16px;
  }

  .avatar-gradient {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 50%, #d946ef 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(168, 85, 247, 0.35);
  }

  .avatar-initial {
    font-size: 36px;
    font-weight: 700;
    color: #ffffff;
    user-select: none;
  }

  /* Heading */
  .user-heading {
    font-size: 22px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 24px;
    letter-spacing: -0.3px;
  }

  /* Form */
  .login-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .input-row {
    position: relative;
    width: 100%;
  }

  .clean-input {
    width: 100%;
    height: 44px;
    background: rgba(22, 27, 34, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0 16px;
    font-size: 14px;
    color: #f8fafc;
    outline: none;
    transition: border-color var(--transition-fast), background var(--transition-fast);
    backdrop-filter: blur(8px);
  }

  .clean-input:focus {
    border-color: rgba(168, 85, 247, 0.5);
    background: rgba(26, 32, 44, 0.9);
  }

  .clean-input::placeholder {
    color: #64748b;
  }

  /* Password field with inside arrow */
  .password-row .clean-input {
    padding-right: 48px;
  }

  .submit-arrow-btn {
    position: absolute;
    right: 6px;
    top: 6px;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .submit-arrow-btn:hover:not(:disabled) {
    background: rgba(168, 85, 247, 0.6);
    color: #ffffff;
    border-color: rgba(168, 85, 247, 0.8);
  }

  .submit-arrow-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .mini-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-notice {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--danger);
    font-size: var(--text-xs);
    text-align: left;
    padding: 0 4px;
  }

  /* OAuth row */
  .oauth-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
  }

  .oauth-pill {
    flex: 1;
    height: 34px;
    border-radius: 17px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
    font-size: 13px;
    cursor: pointer;
    transition: all var(--transition-fast);
    backdrop-filter: blur(4px);
  }

  .oauth-pill:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.16);
    color: #ffffff;
  }

  /* Cancel row */
  .cancel-row {
    margin-top: 14px;
  }

  .cancel-pill {
    padding: 6px 20px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    font-size: 13px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .cancel-pill:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #f1f5f9;
  }

  /* Bottom Left Badge */
  .issue-badge-container {
    position: absolute;
    bottom: 24px;
    left: 24px;
    z-index: 50;
  }

  .issue-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(225, 29, 72, 0.85);
    border-radius: 18px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
  }

  .badge-icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    font-size: 10px;
    font-weight: 700;
  }

  .badge-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.8);
    background: none;
    border: none;
    cursor: pointer;
    margin-left: 2px;
  }

  .badge-close-btn:hover {
    color: #fff;
  }
</style>
