<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import { me } from '$lib/api/auth';

  onMount(async () => {
    try {
      const u = await me();
      if (u) {
        user.set(u);
        goto('/home');
        return;
      }
    } catch {}

    goto('/lockscreen');
  });
</script>
