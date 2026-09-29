<script lang="ts">
  import { onMount } from 'svelte';
  import { login as apiLogin, me, getPublicConfig, type PublicConfig } from '$lib/api/auth';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { ArrowRight, AlertCircle } from '@lucide/svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import WallpaperBackground from '$lib/ui/layout/WallpaperBackground.svelte';

  let username = $state('');
  let password = $state('');
  let loading = $state(false);
  let errorMsg = $state('');
  let passwordInputRef: HTMLInputElement | null = null;

  let publicConfig = $state<PublicConfig | null>(null);

  onMount(async () => {
    try {
      publicConfig = await getPublicConfig();
    } catch {
      // Fallback if node is not yet responding
      publicConfig = {
        panel_name: "Hex Panel",
        label_made_by: "N1N4U",
        discord: "",
        github: "",
        feedback: "",
        auth: {
          password: true,
          discord: false,
          google: false,
          gmail: false
        }
      };
    }

    if (passwordInputRef) {
      passwordInputRef.focus();
    }
  });

  const discordEnabled = $derived(publicConfig?.auth?.discord ?? false);
  const googleEnabled = $derived(publicConfig?.auth?.google ?? false);
  const gmailEnabled = $derived(publicConfig?.auth?.gmail ?? false);

  async function handleLogin() {
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
      errorMsg = err?.message || 'Login failed. Please verify credentials.';
      password = '';
      passwordInputRef?.focus();
    } finally {
      loading = false;
    }
  }

  function handleProviderClick(name: string, enabled: boolean) {
    if (!enabled) return;
    addToast(`${name} authentication initiated`, 'info');
  }

  function handleCancel() {
    goto('/lockscreen');
  }
</script>

<div class="login-root">
  <!-- Blurred Wallpaper Background (matching OS login) -->
  <WallpaperBackground blur={28} tint={0.55} />

  <div class="login-card">
    <!-- Clean Circular Avatar (No outer blur) -->
    <div class="avatar-box">
      <div class="avatar-circle">
        <span class="avatar-letter">{username ? username.charAt(0).toUpperCase() : 'A'}</span>
      </div>
    </div>

    <!-- Administrator Heading -->
    <h2 class="user-title">{username || 'Administrator'}</h2>

    <!-- Form -->
    <form class="login-form" onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <!-- Username Input -->
      <div class="field-wrap">
        <input
          type="text"
          class="os-input"
          placeholder="Username"
          bind:value={username}
          autocomplete="username"
          disabled={loading}
        />
      </div>

      <!-- Password Input with embedded Arrow button -->
      <div class="field-wrap password-wrap">
        <input
          type="password"
          class="os-input"
          placeholder="Password"
          bind:value={password}
          bind:this={passwordInputRef}
          autocomplete="current-password"
          disabled={loading}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleLogin();
            }
          }}
        />
        <button
          type="submit"
          class="submit-btn"
          disabled={loading || !password}
          aria-label="Login"
        >
          {#if loading}
            <span class="mini-spinner"></span>
          {:else}
            <ArrowRight size={18} />
          {/if}
        </button>
      </div>

      {#if errorMsg}
        <div class="error-badge">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      {/if}

      <!-- Provider Pills (Config-Driven) -->
      <div class="providers-row">
        <button
          type="button"
          class="provider-pill"
          class:is-disabled={!discordEnabled}
          disabled={!discordEnabled}
          onclick={() => handleProviderClick('Discord', discordEnabled)}
          title={discordEnabled ? 'Sign in with Discord' : 'Disabled in settings.json'}
        >
          Discord
        </button>

        <button
          type="button"
          class="provider-pill"
          class:is-disabled={!googleEnabled}
          disabled={!googleEnabled}
          onclick={() => handleProviderClick('Google', googleEnabled)}
          title={googleEnabled ? 'Sign in with Google' : 'Disabled in settings.json'}
        >
          Google
        </button>

        <button
          type="button"
          class="provider-pill"
          class:is-disabled={!gmailEnabled}
          disabled={!gmailEnabled}
          onclick={() => handleProviderClick('Gmail', gmailEnabled)}
          title={gmailEnabled ? 'Sign in with Gmail' : 'Disabled in settings.json'}
        >
          Gmail
        </button>
      </div>

      <!-- Cancel Button -->
      <div class="cancel-wrap">
        <button type="button" class="cancel-btn" onclick={handleCancel}>
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .login-root {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    font-family: var(--font-sans);
    overflow: hidden;
  }

  .login-card {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 350px;
    text-align: center;
  }

  /* Clean Circular Avatar (No outer blur) */
  .avatar-box {
    margin-bottom: 20px;
  }

  .avatar-circle {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #c026d3 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-letter {
    font-size: 40px;
    font-weight: 700;
    color: #ffffff;
    line-height: 1;
  }

  /* Administrator Title */
  .user-title {
    font-size: 26px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 26px;
    letter-spacing: -0.4px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  }

  /* Form */
  .login-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field-wrap {
    position: relative;
    width: 100%;
  }

  .os-input {
    width: 100%;
    height: 48px;
    background: rgba(18, 22, 30, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0 18px;
    font-size: 15px;
    color: #ffffff;
    outline: none;
    transition: all var(--transition-fast);
    backdrop-filter: blur(12px);
    box-sizing: border-box;
  }

  /* Mouse hover & focus: crisp white outline matching cancel and buttons */
  .os-input:hover {
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .os-input:focus {
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
    background: rgba(22, 28, 38, 0.9);
  }

  .os-input::placeholder {
    color: #64748b;
  }

  /* Password field with submit arrow */
  .password-wrap .os-input {
    padding-right: 52px;
  }

  .submit-btn {
    position: absolute;
    right: 7px;
    top: 7px;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .submit-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.45);
    color: #ffffff;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .submit-btn:disabled {
    opacity: 0.35;
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

  .error-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #f43f5e;
    font-size: 13px;
    padding: 0 4px;
    text-align: left;
  }

  /* Providers Row */
  .providers-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 6px;
  }

  .provider-pill {
    flex: 1;
    height: 38px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    font-size: 14px;
    cursor: pointer;
    transition: all var(--transition-fast);
    backdrop-filter: blur(8px);
  }

  .provider-pill:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.45);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  /* Disabled state: greyed out, unclickable */
  .provider-pill.is-disabled,
  .provider-pill:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
    color: #64748b;
  }

  /* Cancel Button */
  .cancel-wrap {
    margin-top: 14px;
  }

  .cancel-btn {
    padding: 8px 24px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #94a3b8;
    font-size: 14px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.45);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
</style>
