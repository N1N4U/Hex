<script lang="ts">
  import PageHeader from '$lib/ui/layout/PageHeader.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Badge from '$lib/ui/primitives/Badge.svelte';
  import Dialog from '$lib/ui/overlay/Dialog.svelte';
  import Input from '$lib/ui/primitives/Input.svelte';
  import Dropdown from '$lib/ui/primitives/Dropdown.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { Plus, Shield, Trash2, AlertTriangle } from '@lucide/svelte';

  interface Rule {
    id: string;
    port: string;
    protocol: 'TCP' | 'UDP' | 'Both';
    direction: 'In' | 'Out';
    action: 'Allow' | 'Deny';
    source: string;
    desc: string;
  }

  let enabled = $state(true);
  let showAddDialog = $state(false);
  let showFlushDialog = $state(false);

  let newPort = $state('');
  let newProtocol = $state('TCP');
  let newAction = $state('Allow');
  let newSource = $state('Anywhere');
  let newDesc = $state('');

  let rules = $state<Rule[]>([
    { id: 'r-1', port: '22', protocol: 'TCP', direction: 'In', action: 'Allow', source: 'Anywhere', desc: 'SSH remote management' },
    { id: 'r-2', port: '80, 443', protocol: 'TCP', direction: 'In', action: 'Allow', source: 'Anywhere', desc: 'HTTP/HTTPS web traffic' },
    { id: 'r-3', port: '9000', protocol: 'TCP', direction: 'In', action: 'Allow', source: 'Anywhere', desc: 'Hex Node Web Panel' },
    { id: 'r-4', port: '8080', protocol: 'TCP', direction: 'In', action: 'Allow', source: '192.168.0.0/16', desc: 'Hex Core internal API' }
  ]);

  function handleAddRule() {
    if (!newPort) {
      addToast('Port is required', 'error');
      return;
    }
    const rule: Rule = {
      id: 'r-' + Math.random().toString(36).substring(2, 7),
      port: newPort,
      protocol: newProtocol as any,
      direction: 'In',
      action: newAction as any,
      source: newSource || 'Anywhere',
      desc: newDesc || 'Custom rule'
    };
    rules = [...rules, rule];
    addToast(`Rule for port ${newPort} added`, 'success');
    showAddDialog = false;
    newPort = '';
    newDesc = '';
  }

  function deleteRule(id: string) {
    rules = rules.filter((r) => r.id !== id);
    addToast('Rule deleted', 'info');
  }

  function flushRules() {
    rules = [];
    showFlushDialog = false;
    addToast('All firewall rules flushed', 'warning');
  }
</script>

<div class="firewall-page">
  <PageHeader title="Firewall (UFW)" description="Manage ingress network rules and port filtering policies">
    {#snippet actions()}
      <Button
        variant={enabled ? 'secondary' : 'primary'}
        onclick={() => {
          enabled = !enabled;
          addToast(`Firewall ${enabled ? 'Enabled' : 'Disabled'}`, enabled ? 'success' : 'warning');
        }}
      >
        <Shield size={14} style="margin-right: 4px;" />
        {enabled ? 'Firewall Active' : 'Enable Firewall'}
      </Button>
      <Button variant="primary" icon={Plus} onclick={() => (showAddDialog = true)}>
        Add Rule
      </Button>
    {/snippet}
  </PageHeader>

  <!-- Rules Table -->
  <div class="table-container">
    <table class="rules-table">
      <thead>
        <tr>
          <th>Port</th>
          <th>Protocol</th>
          <th>Direction</th>
          <th>Action</th>
          <th>Source IP</th>
          <th>Description</th>
          <th style="text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
        {#each rules as r (r.id)}
          <tr>
            <td class="font-mono font-bold text-accent">{r.port}</td>
            <td><Badge variant="default" size="sm">{r.protocol}</Badge></td>
            <td><span class="text-secondary">{r.direction}</span></td>
            <td>
              <Badge variant={r.action === 'Allow' ? 'success' : 'danger'} size="sm">
                {r.action}
              </Badge>
            </td>
            <td class="font-mono text-secondary">{r.source}</td>
            <td class="text-secondary">{r.desc}</td>
            <td style="text-align: right;">
              <Button variant="ghost" size="sm" icon={Trash2} onclick={() => deleteRule(r.id)} title="Delete" />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Danger Zone -->
  <div class="danger-box">
    <div>
      <div class="danger-title">Flush All Firewall Rules</div>
      <div class="danger-desc">This drops all custom port filters and resets default policy.</div>
    </div>
    <Button variant="danger" icon={AlertTriangle} onclick={() => (showFlushDialog = true)}>
      Flush Rules
    </Button>
  </div>
</div>

{#if showAddDialog}
  <Dialog title="Add Firewall Rule" size="md" onclose={() => (showAddDialog = false)}>
    <div class="form-dialog">
      <Input label="Port or Port Range" placeholder="e.g. 3306 or 8000:8080" bind:value={newPort} required />
      <Input label="Source IP Address" placeholder="Anywhere or 192.168.1.0/24" bind:value={newSource} />
      <Input label="Description" placeholder="Database port" bind:value={newDesc} />

      <div class="modal-buttons">
        <Button variant="ghost" onclick={() => (showAddDialog = false)}>Cancel</Button>
        <Button variant="primary" onclick={handleAddRule}>Add Rule</Button>
      </div>
    </div>
  </Dialog>
{/if}

{#if showFlushDialog}
  <Dialog title="Flush All Firewall Rules?" size="sm" onclose={() => (showFlushDialog = false)}>
    <div class="form-dialog">
      <p class="text-secondary">Are you sure you want to flush all active firewall rules? This cannot be undone.</p>
      <div class="modal-buttons">
        <Button variant="ghost" onclick={() => (showFlushDialog = false)}>Cancel</Button>
        <Button variant="danger" onclick={flushRules}>Flush All</Button>
      </div>
    </div>
  </Dialog>
{/if}

<style>
  .firewall-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .table-container {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-card);
  }

  .rules-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .rules-table th {
    text-align: left;
    padding: 12px 16px;
    background: var(--bg-elevated);
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
  }

  .rules-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .font-mono { font-family: var(--font-mono); }
  .font-bold { font-weight: 600; }
  .text-accent { color: var(--accent); }
  .text-secondary { color: var(--text-secondary); }

  .danger-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--danger-subtle);
    border: 1px solid rgba(255, 77, 77, 0.2);
    border-radius: var(--radius-lg);
    margin-top: var(--space-4);
  }

  .danger-title {
    font-weight: 600;
    color: var(--danger);
  }

  .danger-desc {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .form-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .modal-buttons {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
