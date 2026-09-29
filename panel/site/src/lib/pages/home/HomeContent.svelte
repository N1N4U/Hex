<script lang="ts">
  import CpuCard from './CpuCard.svelte';
  import RamCard from './RamCard.svelte';
  import StorageCard from './StorageCard.svelte';
  import NetworkCard from './NetworkCard.svelte';
  import ServerHeroCard from './ServerHeroCard.svelte';
  import { onMount } from 'svelte';
  import { get } from '$lib/api/client';
  import { stats } from '$lib/stores/core';

  onMount(async () => {
    // Eagerly fetch initial stats on mount so cards populate immediately
    try {
      const s = await get<any>('/core/stats');
      if (s && (s.cpu_usage !== undefined || s.mem_used !== undefined)) {
        stats.set(s);
      }
    } catch {}
  });
</script>

<div class="home-grid">
  <!-- Column 1: CPU + Storage (1:1 height ratio filling screen height) -->
  <div class="grid-col">
    <div class="card-cell">
      <CpuCard />
    </div>
    <div class="card-cell">
      <StorageCard />
    </div>
  </div>

  <!-- Column 2: Center Hero Card -->
  <div class="grid-col center-col">
    <ServerHeroCard />
  </div>

  <!-- Column 3: RAM + Network (1:1 height ratio filling screen height) -->
  <div class="grid-col">
    <div class="card-cell">
      <RamCard />
    </div>
    <div class="card-cell">
      <NetworkCard />
    </div>
  </div>
</div>

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
