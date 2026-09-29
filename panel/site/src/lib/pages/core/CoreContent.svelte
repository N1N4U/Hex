<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, Server, Cpu, HardDrive, Globe, Trash2 } from '@lucide/svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import Dialog from '$lib/ui/overlay/Dialog.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import { nodeStore, loadNodes, addCoreNode, deleteCoreNode, type NodeInfo } from '$lib/stores/node.svelte';

  let showIps = $state<Record<string, boolean>>({});
  let showAddDialog = $state(false);
  let isSubmitting = $state(false);

  // New core form fields per user spec
  let newName = $state('');
  let newProtocol = $state<'http' | 'https'>('http');
  let newHostIp = $state('');
  let newPort = $state<number>(8080);
  let newApiKey = $state('');

  onMount(async () => {
    await loadNodes();
  });

  function toggleShowIp(id: string) {
    showIps[id] = !showIps[id];
  }

  async function handleRemove(id: string, name: string) {
    await deleteCoreNode(id);
    addToast(`Removed ${name} from Core Management`, 'info');
  }

  function handleToggleCore(core: NodeInfo) {
    nodeStore.setActive(core.id);
    addToast(`Switched active core to ${core.name}`, 'info');
  }

  async function handleAddCore() {
    if (!newName.trim()) {
      addToast('Core Name is required', 'error');
      return;
    }
    if (!newHostIp.trim()) {
      addToast('Host IP is required', 'error');
      return;
    }
    if (!newApiKey.trim()) {
      addToast('API Key is mandatory and cannot be empty', 'error');
      return;
    }

    isSubmitting = true;
    try {
      await addCoreNode({
        name: newName.trim(),
        ip_address: newHostIp.trim(),
        port: newPort || 8080,
        protocol: newProtocol,
        api_key: newApiKey.trim()
      });
      addToast(`Core '${newName}' connected successfully`, 'success');
      showAddDialog = false;
      newName = '';
      newHostIp = '';
      newPort = 8080;
      newApiKey = '';
    } catch (err: any) {
      addToast(err?.message || 'Failed to connect to core. Verify host IP & API Key.', 'error');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="core-page-root">
  <!-- Header row matching screenshot -->
  <div class="core-header-row">
    <div class="header-titles">
      <h1 class="page-title">Core Management</h1>
      <p class="page-subtitle">Manage your connected Hex Cores.</p>
    </div>

    <button
      type="button"
      class="add-core-btn"
      onclick={() => (showAddDialog = true)}
    >
      <Plus size={16} />
      <span>Add Core</span>
    </button>
  </div>

  <!-- Cards Grid matching screenshot -->
  <div class="cores-grid">
    {#each nodeStore.nodes as core (core.id)}
      {@const isOnline = core.status === 'online'}
      {@const isActive = nodeStore.activeId === core.id}
      <div class="core-card">
        <!-- Top row: Avatar, Name, Show IP, and status dot -->
        <div class="card-top-row">
          <div class="core-info-left">
            <div class="core-icon-circle">
              <Server size={18} />
            </div>
            <div class="core-text-col">
              <h3 class="core-name">{core.name}</h3>
              <button
                type="button"
                class="ip-toggle-btn"
                onclick={() => toggleShowIp(core.id)}
                title="Click to view IP address"
              >
                {showIps[core.id] ? `${core.protocol}://${core.ip_address}:${core.port}` : 'Click to show IP'}
              </button>
            </div>
          </div>

          <span
            class="status-dot"
            class:is-connected={isOnline}
            title={isOnline ? 'Connected' : 'Offline'}
          ></span>
        </div>

        <!-- Middle row: 4 stats -->
        <div class="card-stats-row">
          <div class="stat-pill">
            <Cpu size={14} class="stat-icon" />
            <span class="stat-val">0% CPU</span>
          </div>
          <div class="stat-pill">
            <Server size={14} class="stat-icon" />
            <span class="stat-val">0.0GB RAM</span>
          </div>
          <div class="stat-pill">
            <HardDrive size={14} class="stat-icon" />
            <span class="stat-val">0.0GB Storage</span>
          </div>
          <div class="stat-pill">
            <Globe size={14} class="stat-icon" />
            <span class="stat-val">0 B/s</span>
          </div>
        </div>

        <!-- Divider line -->
        <div class="card-divider"></div>

        <!-- Bottom row: Toggle switch & Remove button -->
        <div class="card-bottom-row">
          <label class="toggle-wrap">
            <input
              type="checkbox"
              class="toggle-input"
              checked={isOnline}
              onchange={() => handleToggleCore(core)}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-label">{isOnline ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </label>

          <button
            type="button"
            class="remove-btn"
            onclick={() => handleRemove(core.id, core.name)}
          >
            <Trash2 size={14} />
            <span>Remove</span>
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Add Core Dialog (Strictly implements user specification) -->
{#if showAddDialog}
  <Dialog title="Add Core" size="md" onclose={() => (showAddDialog = false)}>
    <form onsubmit={(e) => { e.preventDefault(); handleAddCore(); }} class="add-core-form">
      <!-- 1. Name -->
      <div class="form-group">
        <label for="core-name">Name</label>
        <input
          id="core-name"
          type="text"
          placeholder="e.g. Mine or Production Core"
          bind:value={newName}
          class="dialog-input"
          required
        />
      </div>

      <!-- 2. Protocol dropdown | Host IP input | Port (default 8080) -->
      <div class="protocol-host-port-row">
        <div class="form-group protocol-group">
          <label for="core-protocol">Protocol</label>
          <select id="core-protocol" bind:value={newProtocol} class="dialog-select">
            <option value="http">http</option>
            <option value="https">https (uses mTLS)</option>
          </select>
        </div>

        <div class="form-group host-group">
          <label for="core-host">Host IP</label>
          <input
            id="core-host"
            type="text"
            placeholder="127.0.0.1 or 192.168.1.10"
            bind:value={newHostIp}
            class="dialog-input"
            required
          />
        </div>

        <div class="form-group port-group">
          <label for="core-port">Port</label>
          <input
            id="core-port"
            type="number"
            bind:value={newPort}
            class="dialog-input"
            required
          />
        </div>
      </div>

      <!-- 3. API Key (NOT optional) -->
      <div class="form-group">
        <label for="core-apikey">
          API Key <span class="required-star">*</span>
        </label>
        <input
          id="core-apikey"
          type="password"
          placeholder="Enter core API key (mandatory)"
          bind:value={newApiKey}
          class="dialog-input"
          required
        />
        <span class="field-hint">The API key is required to authenticate node with hex-core.</span>
      </div>

      <div class="dialog-actions">
        <Button variant="ghost" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Connecting...' : 'Connect Core'}
        </Button>
      </div>
    </form>
  </Dialog>
{/if}

<style>
  .core-page-root {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    user-select: none;
    font-family: var(--font-sans);
  }

  .core-header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .header-titles {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .page-title {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.4px;
    margin: 0;
  }

  .page-subtitle {
    font-size: 13.5px;
    color: #94a3b8;
    margin: 0;
  }

  /* Add Core button */
  .add-core-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.35);
    color: #22c55e;
    font-size: 13.5px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, transform 100ms ease;
  }

  .add-core-btn:hover {
    background: rgba(34, 197, 94, 0.22);
    border-color: rgba(34, 197, 94, 0.55);
    color: #4ade80;
  }

  .add-core-btn:active {
    transform: scale(0.98);
  }

  /* Grid of cores */
  .cores-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
  }

  /* Core Card */
  .core-card {
    background: rgba(12, 16, 22, 0.76);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 10px 30px rgba(0, 0, 0, 0.45);
    border-radius: 14px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    transition: border-color 150ms ease, transform 150ms ease;
  }

  .core-card:hover {
    border-color: rgba(255, 255, 255, 0.14);
  }

  /* Top row */
  .card-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .core-info-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .core-icon-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
  }

  .core-text-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .core-name {
    font-size: 16px;
    font-weight: 700;
    color: #f8fafc;
    margin: 0;
    line-height: 1.2;
  }

  .ip-toggle-btn {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    color: #94a3b8;
    cursor: pointer;
    text-align: left;
    transition: color 120ms ease;
  }

  .ip-toggle-btn:hover {
    color: #e2e8f0;
  }

  /* Status dot (no glow) */
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #64748b;
    transition: background 200ms ease;
  }

  .status-dot.is-connected {
    background: #22c55e;
  }

  /* Stats row */
  .card-stats-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .stat-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #cbd5e1;
  }

  :global(.stat-icon) {
    color: #94a3b8;
  }

  .stat-val {
    font-family: var(--font-mono, monospace);
    font-size: 11.5px;
    color: #cbd5e1;
  }

  /* Divider */
  .card-divider {
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
  }

  /* Bottom row */
  .card-bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Toggle Switch */
  .toggle-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    width: 38px;
    height: 20px;
    background: #334155;
    border-radius: 9999px;
    position: relative;
    transition: background 200ms ease;
  }

  .toggle-slider::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: #ffffff;
    border-radius: 50%;
    transition: transform 200ms ease;
  }

  .toggle-input:checked + .toggle-slider {
    background: #22c55e;
  }

  .toggle-input:checked + .toggle-slider::after {
    transform: translateX(18px);
  }

  .toggle-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #94a3b8;
  }

  /* Remove Button */
  .remove-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.28);
    color: #f87171;
    font-size: 12.5px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  }

  .remove-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
    color: #fca5a5;
  }

  /* Form inside Add Core Dialog */
  .add-core-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 12.5px;
    font-weight: 600;
    color: #cbd5e1;
  }

  .required-star {
    color: #ef4444;
  }

  .protocol-host-port-row {
    display: flex;
    gap: 10px;
  }

  .protocol-group {
    flex: 1.2;
  }

  .host-group {
    flex: 2;
  }

  .port-group {
    flex: 0.9;
  }

  .dialog-select {
    width: 100%;
    height: 40px;
    background: #1a202c;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0 10px;
    color: #ffffff;
    font-size: 13.5px;
    outline: none;
    box-sizing: border-box;
    cursor: pointer;
  }

  .dialog-select:focus {
    border-color: #22c55e;
  }

  .dialog-input {
    width: 100%;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 0 12px;
    color: #ffffff;
    font-size: 13.5px;
    outline: none;
    box-sizing: border-box;
  }

  .dialog-input:focus {
    border-color: #22c55e;
  }

  .field-hint {
    font-size: 11.5px;
    color: #64748b;
    margin-top: 2px;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
  }
</style>
