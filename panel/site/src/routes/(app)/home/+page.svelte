<script lang="ts">
  import { stats } from "$lib/stores/core";

  function fmtBytes(b: number) {
    if (!b) return "0 B";
    const k = 1024, s = ["B","KB","MB","GB","TB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / k**i).toFixed(1) + " " + s[i];
  }

  $: cpu  = $stats?.cpu ?? 0;
  $: memP = $stats ? ($stats.mem_used / $stats.mem_total) * 100 : 0;
  $: dskP = $stats ? ($stats.disk_used / $stats.disk_total) * 100 : 0;
</script>

<div class="h-full overflow-y-auto py-2">
  <!-- Stats row -->
  <div class="grid grid-cols-2 gap-3 mb-3 sm:grid-cols-4">
    <!-- CPU -->
    <div class="glass p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-on-surface-variant text-xs font-medium">CPU</span>
        <span class="icon text-secondary text-sm">memory</span>
      </div>
      <div class="text-2xl font-bold text-on-surface">{cpu.toFixed(1)}<span class="text-sm font-normal text-on-surface-variant">%</span></div>
      <div class="h-1 bg-surface-container-high rounded-full overflow-hidden">
        <div class="h-full bg-primary rounded-full transition-all" style="width:{cpu}%"></div>
      </div>
    </div>

    <!-- RAM -->
    <div class="glass p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-on-surface-variant text-xs font-medium">RAM</span>
        <span class="icon text-secondary text-sm">device_hub</span>
      </div>
      <div class="text-2xl font-bold text-on-surface">{memP.toFixed(1)}<span class="text-sm font-normal text-on-surface-variant">%</span></div>
      <div class="h-1 bg-surface-container-high rounded-full overflow-hidden">
        <div class="h-full bg-secondary rounded-full transition-all" style="width:{memP}%"></div>
      </div>
      {#if $stats}
        <span class="text-on-surface-variant text-[10px]">{fmtBytes($stats.mem_used)} / {fmtBytes($stats.mem_total)}</span>
      {/if}
    </div>

    <!-- Disk -->
    <div class="glass p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-on-surface-variant text-xs font-medium">Disk</span>
        <span class="icon text-tertiary text-sm">storage</span>
      </div>
      <div class="text-2xl font-bold text-on-surface">{dskP.toFixed(1)}<span class="text-sm font-normal text-on-surface-variant">%</span></div>
      <div class="h-1 bg-surface-container-high rounded-full overflow-hidden">
        <div class="h-full bg-tertiary rounded-full transition-all" style="width:{dskP}%"></div>
      </div>
    </div>

    <!-- Uptime -->
    <div class="glass p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-on-surface-variant text-xs font-medium">Uptime</span>
        <span class="icon text-primary text-sm">schedule</span>
      </div>
      <div class="text-base font-semibold text-on-surface">{$stats?.uptime ?? "—"}</div>
      <div class="text-on-surface-variant text-[10px]">{$stats?.os_name ?? "—"}</div>
    </div>
  </div>

  <!-- System info -->
  {#if $stats?.cpu_model}
    <div class="glass p-4 flex items-center gap-3 text-xs text-on-surface-variant">
      <span class="icon text-base">dns</span>
      <span>{$stats.cpu_model}</span>
      {#if $stats.cpu_cores}
        <span class="ml-auto">{$stats.cpu_cores} cores</span>
      {/if}
    </div>
  {/if}
</div>
