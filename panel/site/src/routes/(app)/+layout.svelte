<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { user } from "$lib/stores/auth";
  import { connect, disconnect, on } from "$lib/ws/client";
  import { stats, wsStatus } from "$lib/stores/core";

  // Dock definition
  const dock = [
    { id: "home",     label: "Home",     icon: "home",       color: "text-white" },
    { id: "docker",   label: "Docker",   icon: "deployed_code", color: "text-blue-400" },
    { id: "files",    label: "Files",    icon: "folder",     color: "text-yellow-400" },
    { id: "nginx",    label: "Nginx",    icon: "public",     color: "text-green-400" },
    { id: "firewall", label: "Firewall", icon: "security",   color: "text-red-400" },
    { id: "terminal", label: "Terminal", icon: "terminal",   color: "text-cyan-300" },
    { id: "settings", label: "Settings", icon: "settings",   color: "text-on-surface-variant" },
  ];

  $: activeApp = $page.url.pathname.split("/")[1] || "home";

  function navigate(id: string) {
    goto(id === "home" ? "/" : "/" + id);
  }

  onMount(() => {
    connect();
    const offStatus = on("__status__", (s) => wsStatus.set(s as any));
    const offStats  = on("stats", (msg: any) => stats.set(msg.data));
    return () => { offStatus(); offStats(); disconnect(); };
  });
</script>

<!-- Wallpaper -->
<div class="fixed inset-0 z-0">
  <div class="w-full h-full bg-cover bg-center"
    style="background-image: url('/wallpaper/default.jpg'); background-color: #0b1326;">
  </div>
  <div class="absolute inset-0" style="background: rgba(5,10,20,0.65);"></div>
</div>

<!-- App content -->
<main class="relative z-10 h-screen w-full flex flex-col overflow-hidden">
  <!-- Top bar -->
  <header class="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
    <span class="text-on-surface font-semibold text-sm tracking-tight flex items-center gap-1.5">
      <span class="icon text-primary text-base icon-fill">hexagon</span>
      Hex
    </span>
    <div class="flex items-center gap-3">
      {#if $stats}
        <span class="text-on-surface-variant text-xs">{$stats.os_name}</span>
        <span class="text-on-surface-variant/50 text-xs">↑ {$stats.uptime}</span>
      {/if}
      <span class="text-on-surface-variant text-xs">{$user?.username ?? ""}</span>
    </div>
  </header>

  <!-- Main view -->
  <div class="flex-1 overflow-hidden px-4 pb-2">
    <slot />
  </div>

  <!-- Mac Dock -->
  <nav class="flex-shrink-0 flex justify-center pb-3">
    <div class="glass flex items-end gap-1.5 px-3 py-2">
      {#each dock as app}
        <button
          title={app.label}
          on:click={() => navigate(app.id)}
          class="flex flex-col items-center gap-0.5 group"
        >
          <div class="{activeApp === app.id ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-white/8'} w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200">
            <span class="icon {app.color} text-2xl {activeApp === app.id ? 'icon-fill' : ''}">{app.icon}</span>
          </div>
          {#if activeApp === app.id}
            <div class="w-1 h-1 rounded-full bg-primary"></div>
          {:else}
            <div class="w-1 h-1"></div>
          {/if}
        </button>
      {/each}
    </div>
  </nav>
</main>
