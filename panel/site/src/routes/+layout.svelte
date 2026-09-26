<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { loadUser, user, ready } from "$lib/stores/auth";

  onMount(loadUser);

  // Redirect to login if not authenticated and not already on login page
  $: if ($ready && !$user && !$page.url.pathname.startsWith("/login")) {
    goto("/login");
  }
  $: if ($ready && $user && $page.url.pathname === "/login") {
    goto("/");
  }
</script>

{#if !$ready}
  <!-- Loading splash -->
  <div class="fixed inset-0 flex items-center justify-center bg-[#0b1326]">
    <div class="flex flex-col items-center gap-3">
      <span class="icon text-primary text-5xl icon-fill">hexagon</span>
      <span class="text-on-surface-variant text-sm">Loading...</span>
    </div>
  </div>
{:else}
  <slot />
{/if}
