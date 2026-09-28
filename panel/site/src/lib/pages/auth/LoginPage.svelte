<script lang="ts">
  import Input from '$lib/ui/primitives/Input.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Alert from '$lib/ui/feedback/Alert.svelte';
  import Separator from '$lib/ui/primitives/Separator.svelte';
  import OAuthButtons from './OAuthButtons.svelte';
  import { login as apiLogin, me } from '$lib/api/auth';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { slideUp } from '$lib/ui/motion/transitions';
  import { Lock, User } from '@lucide/svelte';

  let username = $state('');
  let password = $state('');
  let loading = $state(false);
  let errorMsg = $state('');

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    if (!username || !password) {
      errorMsg = 'Please enter your username and password';
      return;
    }

    loading = true;
    errorMsg = '';

    try {
      const res = await apiLogin(username, password);
      if (res.ok) {
        const u = await me();
        user.set(u);
        goto('/home');
      } else {
        errorMsg = 'Invalid username or password';
      }
    } catch (err: any) {
      errorMsg = err?.message || 'Login failed. Please verify credentials.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-wrapper">
  <div class="login-card" transition:slideUp={{ duration: 300, distance: 12 }}>
    <!-- Header -->
    <div class="login-header">
      <div class="logo-box">
        <span class="logo-text">Hex</span>
      </div>
      <h2 class="login-title">Sign in to your panel</h2>
      <p class="login-subtitle">Enter your credentials or authenticate via provider</p>
    </div>

    {#if errorMsg}
      <Alert variant="danger" title="Authentication Error" message={errorMsg} dismissible />
    {/if}

    <OAuthButtons providers={['discord', 'google', 'github']} />

    <Separator text="or continue with credentials" />

    <!-- Form -->
    <form class="login-form" onsubmit={handleLogin}>
      <Input
        name="username"
        type="text"
        label="Username or Email"
        placeholder="nandu"
        bind:value={username}
        icon={User}
        required
      />

      <Input
        name="password"
        type="password"
        label="Password"
        placeholder="????????????"
        bind:value={password}
        icon={Lock}
        required
      />

      <Button
        variant="primary"
        size="lg"
        type="submit"
        fullWidth
        {loading}
      >
        Sign In
      </Button>
    </form>

    <div class="login-footer">
      <span class="version-tag">Hex Node v0.1.0 ? Secure Authentication</span>
    </div>
  </div>
</div>

<style>
  .login-wrapper {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-base);
    padding: var(--space-4);
    z-index: var(--z-dialog);
  }

  .login-card {
    width: 100%;
    max-width: 420px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-elevated);
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 4px;
  }

  .logo-box {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-2);
  }

  .logo-text {
    font-size: 32px;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: -1px;
    text-shadow: 0 0 16px var(--accent-glow);
  }

  .login-title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
  }

  .login-subtitle {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .login-footer {
    display: flex;
    justify-content: center;
    padding-top: var(--space-2);
  }

  .version-tag {
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-family: var(--font-mono);
  }
</style>
