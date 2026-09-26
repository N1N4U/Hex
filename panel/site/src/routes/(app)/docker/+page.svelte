<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "$lib/api/client";

  interface Container {
    id: string; name: string; image: string;
    status: string; state: string;
    cpu?: number; mem?: number;
  }

  let containers: Container[] = [];
  let loading = true;
  let error = "";

  async function load() {
    loading = true; error = "";
    try {
      const data = await get<{ containers: Container[] }>("/core/docker/containers");
      containers = data.containers ?? [];
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Failed to load containers";
    } finally { loading = false; }
  }

  async function action(id: string, act: string) {
    await fetch(`/api/v1/core/docker/action?id=${id}&action=${act}`, { method: "POST", credentials: "include" });
    load();
  }

  onMount(load);
</script>

<div class="h-full overflow-y-auto py-2 flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <h2 class="text-on-surface font-semibold text-sm flex items-center gap-2">
      <span class="icon text-secondary">deployed_code</span> Containers
    </h2>
    <button on:click={load} class="icon text-on-surface-variant hover:text-on-surface transition-colors text-base">refresh</button>
  </div>

  {#if loading}
    <div class="text-on-surface-variant text-xs text-center py-8">Loading...</div>
  {:else if error}
    <div class="glass p-4 text-error text-xs">{error}</div>
  {:else if containers.length === 0}
    <div class="text-on-surface-variant text-xs text-center py-8">No containers</div>
  {:else}
    <div class="flex flex-col gap-2">
      {#each containers as c}
        <div class="glass p-3 flex items-center gap-3">
          <div class="w-2 h-2 rounded-full flex-shrink-0 {c.state === 'running' ? 'bg-primary' : 'bg-error'}"></div>
          <div class="flex-1 min-w-0">
            <div class="text-on-surface text-xs font-medium truncate">{c.name}</div>
            <div class="text-on-surface-variant text-[10px] truncate">{c.image}</div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            {#if c.state === "running"}
              <button on:click={() => action(c.id, "stop")}
                class="icon text-error/80 hover:text-error text-base transition-colors" title="Stop">stop</button>
              <button on:click={() => action(c.id, "restart")}
                class="icon text-secondary/80 hover:text-secondary text-base transition-colors" title="Restart">restart_alt</button>
            {:else}
              <button on:click={() => action(c.id, "start")}
                class="icon text-primary/80 hover:text-primary text-base transition-colors" title="Start">play_arrow</button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
