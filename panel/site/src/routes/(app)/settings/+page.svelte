<script lang="ts">
  import { logout } from "$lib/api/auth";
  import { goto } from "$app/navigation";
  import { user } from "$lib/stores/auth";

  async function handleLogout() {
    await logout();
    goto("/login");
  }
</script>

<div class="h-full overflow-y-auto py-2 flex flex-col gap-4">
  <h2 class="text-on-surface font-semibold text-sm flex items-center gap-2">
    <span class="icon text-on-surface-variant">settings</span> Settings
  </h2>

  <!-- Account -->
  <div class="glass p-4 flex flex-col gap-3">
    <div class="text-on-surface-variant text-xs font-medium uppercase tracking-wider">Account</div>
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
        <span class="icon text-primary text-base">person</span>
      </div>
      <div>
        <div class="text-on-surface text-sm font-medium">{$user?.username}</div>
        <div class="text-on-surface-variant text-xs">{$user?.role}</div>
      </div>
    </div>
    <button on:click={handleLogout}
      class="flex items-center gap-2 text-error text-sm hover:opacity-80 transition-opacity">
      <span class="icon text-base">logout</span>
      Sign out
    </button>
  </div>
</div>
