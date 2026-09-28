<script lang="ts">
  import { page } from '$app/stores';
  import NotFoundPage from '$lib/pages/errors/NotFoundPage.svelte';
  import ErrorPage from '$lib/pages/errors/ErrorPage.svelte';
</script>

{#if $page.status === 404}
  <NotFoundPage />
{:else}
  <ErrorPage status={$page.status} message={$page.error?.message} />
{/if}
