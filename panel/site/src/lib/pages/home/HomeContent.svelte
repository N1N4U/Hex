<script lang="ts">
  import CpuCard from './CpuCard.svelte';
  import RamCard from './RamCard.svelte';
  import StorageCard from './StorageCard.svelte';
  import NetworkCard from './NetworkCard.svelte';
  import ServerHeroCard from './ServerHeroCard.svelte';
  import CpuModal from './CpuModal.svelte';
  import RamModal from './RamModal.svelte';
  import StorageModal from './StorageModal.svelte';
  import NetworkModal from './NetworkModal.svelte';
  import { onMount } from 'svelte';
  import { get } from '$lib/api/client';
  import { stats } from '$lib/stores/core';

  let showCpuModal = $state(false);
  let showRamModal = $state(false);
  let showStorageModal = $state(false);
  let showNetworkModal = $state(false);

  onMount(() => {
    // Initial one-off fetch so values appear instantly while WS connects
    const fetchStats = async () => {
      try {
        const s = await get<any>('/core/stats');
        if (s && (s.cpu_usage !== undefined || s.mem_used !== undefined)) {
          stats.update((prev) => {
            if (!prev) return s;
            return {
              ...prev,
              ...s,
              partitions: (s.partitions && s.partitions.length > 0) ? s.partitions : prev.partitions,
              docker_images_size: (s.docker_images_size !== undefined && s.docker_images_size > 0) ? s.docker_images_size : prev.docker_images_size,
              docker_logs_size: (s.docker_logs_size !== undefined && s.docker_logs_size > 0) ? s.docker_logs_size : prev.docker_logs_size,
              docker_storage_size: (s.docker_storage_size !== undefined && s.docker_storage_size > 0) ? s.docker_storage_size : prev.docker_storage_size,
            };
          });
        }
      } catch {}
    };

    fetchStats();
  });
</script>

<div class="home-grid">
  <!-- Column 1: CPU + Storage (1:1 height ratio filling screen height) -->
  <div class="grid-col">
    <div class="card-cell">
      <CpuCard onclick={() => (showCpuModal = true)} />
    </div>
    <div class="card-cell">
      <StorageCard onclick={() => (showStorageModal = true)} />
    </div>
  </div>

  <!-- Column 2: Center Hero Card -->
  <div class="grid-col center-col">
    <ServerHeroCard />
  </div>

  <!-- Column 3: RAM + Network (1:1 height ratio filling screen height) -->
  <div class="grid-col">
    <div class="card-cell">
      <RamCard onclick={() => (showRamModal = true)} />
    </div>
    <div class="card-cell">
      <NetworkCard onclick={() => (showNetworkModal = true)} />
    </div>
  </div>
</div>

{#if showCpuModal}
  <CpuModal onclose={() => (showCpuModal = false)} />
{/if}

{#if showRamModal}
  <RamModal onclose={() => (showRamModal = false)} />
{/if}

{#if showStorageModal}
  <StorageModal onclose={() => (showStorageModal = false)} />
{/if}

{#if showNetworkModal}
  <NetworkModal onclose={() => (showNetworkModal = false)} />
{/if}

<style>
  .home-grid {
    display: grid;
    grid-template-columns: 1fr 1.35fr 1fr;
    gap: var(--space-5);
    width: 100%;
    height: calc(100vh - 170px);
    min-height: 560px;
    align-items: stretch;
  }

  .grid-col {
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: var(--space-5);
    height: 100%;
    min-height: 0;
  }

  .card-cell {
    height: 100%;
    min-height: 0;
  }

  .center-col {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  @media (max-width: 1100px) {
    .home-grid {
      grid-template-columns: 1fr 1fr;
      height: auto;
      min-height: 0;
    }
    .grid-col {
      grid-template-rows: auto auto;
      height: auto;
    }
    .center-col {
      grid-column: span 2;
      order: -1;
    }
  }

  @media (max-width: 768px) {
    .home-grid {
      grid-template-columns: 1fr;
      height: auto;
      min-height: 0;
    }
    .grid-col {
      grid-template-rows: auto auto;
      height: auto;
    }
    .center-col {
      grid-column: span 1;
    }
  }
</style>
