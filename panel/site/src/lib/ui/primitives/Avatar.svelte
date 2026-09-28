<script lang="ts">
  let {
    name = '',
    src = '',
    size = 'md',
    online = false
  }: {
    name?: string;
    src?: string;
    size?: 'sm' | 'md' | 'lg';
    online?: boolean;
  } = $props();

  const initials = $derived(
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
</script>

<div class="avatar-container {size}">
  {#if src}
    <img {src} alt={name} class="avatar-img" />
  {:else}
    <div class="avatar-initials">{initials}</div>
  {/if}

  {#if online}
    <span class="online-dot"></span>
  {/if}
</div>

<style>
  .avatar-container {
    position: relative;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    flex-shrink: 0;
    user-select: none;
  }

  .sm {
    width: 28px;
    height: 28px;
    font-size: var(--text-xs);
  }

  .md {
    width: 36px;
    height: 36px;
    font-size: var(--text-sm);
  }

  .lg {
    width: 48px;
    height: 48px;
    font-size: var(--text-base);
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-initials {
    font-weight: 600;
    color: var(--accent);
  }

  .online-dot {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--status-online);
    border: 2px solid var(--bg-base);
  }
</style>
