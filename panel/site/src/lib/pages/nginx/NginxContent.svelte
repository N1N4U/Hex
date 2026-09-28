<script lang="ts">
  import PageHeader from '$lib/ui/layout/PageHeader.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Badge from '$lib/ui/primitives/Badge.svelte';
  import Sheet from '$lib/ui/overlay/Sheet.svelte';
  import Input from '$lib/ui/primitives/Input.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { Plus, Globe, ArrowRight, ShieldCheck, Trash2, Edit2 } from '@lucide/svelte';

  interface ProxyRule {
    id: string;
    domain: string;
    target: string;
    ssl: boolean;
    status: 'active' | 'disabled';
    websocket: boolean;
  }

  let proxies = $state<ProxyRule[]>([
    {
      id: 'p-1',
      domain: 'panel.hex.local',
      target: '127.0.0.1:9000',
      ssl: true,
      status: 'active',
      websocket: true
    },
    {
      id: 'p-2',
      domain: 'api.hex.local',
      target: '127.0.0.1:8080',
      ssl: true,
      status: 'active',
      websocket: false
    }
  ]);

  let showSheet = $state(false);
  let newDomain = $state('');
  let newTarget = $state('');
  let newSSL = $state(true);
  let newWS = $state(true);

  function handleAddProxy() {
    if (!newDomain || !newTarget) {
      addToast('Domain and Target are required', 'error');
      return;
    }
    const p: ProxyRule = {
      id: 'p-' + Math.random().toString(36).substring(2, 7),
      domain: newDomain,
      target: newTarget,
      ssl: newSSL,
      status: 'active',
      websocket: newWS
    };
    proxies = [...proxies, p];
    addToast(`Proxy rule created for ${newDomain}`, 'success');
    showSheet = false;
    newDomain = '';
    newTarget = '';
  }

  function deleteProxy(id: string) {
    proxies = proxies.filter((p) => p.id !== id);
    addToast('Proxy rule removed', 'info');
  }
</script>

<div class="nginx-page">
  <PageHeader title="Reverse Proxy" description="Route incoming host domains and manage automatic SSL termination">
    {#snippet actions()}
      <Button variant="primary" icon={Plus} onclick={() => (showSheet = true)}>
        Add Proxy
      </Button>
    {/snippet}
  </PageHeader>

  <div class="proxy-cards">
    {#each proxies as p (p.id)}
      <div class="proxy-card">
        <div class="proxy-main">
          <div class="domain-row">
            <Globe size={18} class="globe-icon" />
            <span class="domain-text">{p.domain}</span>
            {#if p.ssl}
              <Badge variant="success" size="sm">
                <ShieldCheck size={12} style="margin-right: 4px;" /> SSL Active
              </Badge>
            {/if}
            {#if p.websocket}
              <Badge variant="info" size="sm">WS Enabled</Badge>
            {/if}
          </div>

          <div class="target-row">
            <ArrowRight size={14} class="text-muted" />
            <span class="target-text">{p.target}</span>
          </div>
        </div>

        <div class="proxy-actions">
          <Badge variant={p.status === 'active' ? 'success' : 'default'} size="sm" dot>
            {p.status}
          </Badge>
          <Button variant="ghost" size="sm" icon={Trash2} onclick={() => deleteProxy(p.id)} title="Delete" />
        </div>
      </div>
    {/each}
  </div>
</div>

{#if showSheet}
  <Sheet title="Add Reverse Proxy Rule" width="480px" onclose={() => (showSheet = false)}>
    <div class="sheet-form">
      <Input
        label="Domain Name"
        placeholder="app.yourdomain.com"
        bind:value={newDomain}
        required
      />
      <Input
        label="Target Host & Port"
        placeholder="127.0.0.1:3000"
        bind:value={newTarget}
        required
      />

      <div class="toggle-row">
        <label class="toggle-label">
          <input type="checkbox" bind:checked={newSSL} />
          <span>Enable SSL (Let's Encrypt / Custom)</span>
        </label>
      </div>

      <div class="toggle-row">
        <label class="toggle-label">
          <input type="checkbox" bind:checked={newWS} />
          <span>Support WebSocket Upgrade</span>
        </label>
      </div>

      <div class="form-btn">
        <Button variant="primary" fullWidth onclick={handleAddProxy}>
          Save Proxy Rule
        </Button>
      </div>
    </div>
  </Sheet>
{/if}

<style>
  .nginx-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .proxy-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .proxy-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px 20px;
    box-shadow: var(--shadow-card);
  }

  .proxy-main {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .domain-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  

  .domain-text {
    font-size: var(--text-md);
    font-weight: 700;
    color: var(--text-primary);
  }

  .target-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }

  .proxy-actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .sheet-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-sm);
    color: var(--text-primary);
    cursor: pointer;
  }

  .form-btn {
    margin-top: var(--space-3);
  }
</style>
