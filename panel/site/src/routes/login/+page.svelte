<script lang="ts">
  import { login } from "$lib/api/auth";
  import { goto } from "$app/navigation";
  import { loadUser } from "$lib/stores/auth";

  let username = "";
  let password = "";
  let error = "";
  let loading = false;

  async function handleLogin() {
    if (!username || !password) { error = "Enter username and password"; return; }
    loading = true;
    error = "";
    try {
      await login(username, password);
      await loadUser();
      goto("/");
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Login failed";
    } finally {
      loading = false;
    }
  }
</script>

<!-- Background -->
<div class="fixed inset-0 bg-[#0b1326]">
  <div class="absolute inset-0"
    style="background: radial-gradient(ellipse at 20% 80%, rgba(75,226,119,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(13,102,217,0.08) 0%, transparent 60%);">
  </div>
</div>

<div class="relative z-10 flex items-center justify-center h-screen">
  <div class="glass w-full max-w-sm p-8 flex flex-col gap-6">
    <!-- Logo -->
    <div class="flex flex-col items-center gap-2">
      <span class="icon text-primary text-5xl icon-fill">hexagon</span>
      <h1 class="text-on-surface text-xl font-semibold tracking-tight">Hex Panel</h1>
      <p class="text-on-surface-variant text-xs">Sign in to continue</p>
    </div>

    <!-- Form -->
    <form on:submit|preventDefault={handleLogin} class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-on-surface-variant text-xs font-medium" for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          autocomplete="username"
          class="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary transition-colors"
          placeholder="admin"
          disabled={loading}
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-on-surface-variant text-xs font-medium" for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          class="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary transition-colors"
          placeholder="••••••••••••"
          disabled={loading}
        />
      </div>

      {#if error}
        <p class="text-error text-xs bg-error-container/20 border border-error/20 rounded-xl px-3 py-2">{error}</p>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="mt-2 bg-primary text-on-primary rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  </div>
</div>
