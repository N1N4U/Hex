<script lang="ts">
  import CpuCard from './CpuCard.svelte';
  import RamCard from './RamCard.svelte';
  import StorageCard from './StorageCard.svelte';
  import NetworkCard from './NetworkCard.svelte';
  import ServerHeroCard from './ServerHeroCard.svelte';
</script>

<div class="home-grid">
  <!-- Column 1: CPU + Storage -->
  <div class="grid-col">
    <CpuCard />
    <StorageCard />
  </div>

  <!-- Column 2: Center Hero Card -->
  <div class="grid-col center-col">
    <ServerHeroCard />
  </div>

  <!-- Column 3: RAM + Network -->
  <div class="grid-col">
    <RamCard />
    <NetworkCard />
  </div>
</div>

<style>
  .home-grid {
    display: grid;
    grid-template-columns: 1fr 1.35fr 1fr;
    gap: var(--space-5);
    width: 100%;
    align-items: stretch;
  }

  .grid-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .center-col {
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 1100px) {
    .home-grid {
      grid-template-columns: 1fr 1fr;
    }
    .center-col {
      grid-column: span 2;
      order: -1;
    }
  }

  @media (max-width: 768px) {
    .home-grid {
      grid-template-columns: 1fr;
    }
    .center-col {
      grid-column: span 1;
    }
  }
</style>
