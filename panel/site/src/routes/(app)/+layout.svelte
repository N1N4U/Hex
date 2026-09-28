<script lang="ts">
  import type { Snippet } from 'svelte';
  import AppShell from '$lib/ui/layout/AppShell.svelte';

  let { children }: { children?: Snippet } = $props();
</script>

<AppShell panelName="Hex Panel">
  {#if children}
    {@render children()}
  {/if}
</AppShell>
