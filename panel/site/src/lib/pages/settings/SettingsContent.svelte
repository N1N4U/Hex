<script lang="ts">
  import PageHeader from '$lib/ui/layout/PageHeader.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Input from '$lib/ui/primitives/Input.svelte';
  import Badge from '$lib/ui/primitives/Badge.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore';
  import { get } from '$lib/api/client';
  import { onMount } from 'svelte';
  import {
    Settings as SettingsIcon,
    Users,
    Key,
    Share2,
    HardDrive,
    Info,
    RotateCcw
  } from '@lucide/svelte';

  let activeTab = $state<'general' | 'users' | 'oauth' | 'backups' | 'about'>('general');

  let panelName = $state("Nandu's Panel");
  let labelMadeBy = $state('N1N4U');
  let discordLink = $state('https://discord.com/users/1093946948928680008');
  let githubLink = $state('https://github.com/N1N4U/Hex');

  onMount(async () => {
    try {
      const cfg = await get<any>('/config/public');
      if (cfg) {
        if (cfg.panel_name) panelName = cfg.panel_name;
        if (cfg.label_made_by) labelMadeBy = cfg.label_made_by;
        if (cfg.discord) discordLink = cfg.discord;
        if (cfg.github) githubLink = cfg.github;
      }
    } catch {
      // default
    }
  });

  function handleSaveGeneral() {
    addToast('Settings saved successfully', 'success');
  }
</script>

<div class="settings-page">
  <PageHeader title="Panel Settings" description="Configure master settings, users, oauth providers, and system telemetry" />

  <div class="settings-layout">
    <!-- Tabs Nav -->
    <div class="settings-tabs">
      <button
        class="tab-btn"
        class:is-active={activeTab === 'general'}
        onclick={() => (activeTab = 'general')}
      >
        <SettingsIcon size={16} /> General
      </button>

      <button
        class="tab-btn"
        class:is-active={activeTab === 'users'}
        onclick={() => (activeTab = 'users')}
      >
        <Users size={16} /> User Management
      </button>

      <button
        class="tab-btn"
        class:is-active={activeTab === 'oauth'}
        onclick={() => (activeTab = 'oauth')}
      >
        <Share2 size={16} /> OAuth & Auth
      </button>

      <button
        class="tab-btn"
        class:is-active={activeTab === 'backups'}
        onclick={() => (activeTab = 'backups')}
      >
        <HardDrive size={16} /> Backups
      </button>

      <button
        class="tab-btn"
        class:is-active={activeTab === 'about'}
        onclick={() => (activeTab = 'about')}
      >
        <Info size={16} /> About Hex
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-pane">
      {#if activeTab === 'general'}
        <div class="pane-content">
          <h3 class="pane-title">General Preferences</h3>
          <div class="fields-stack">
            <Input label="Panel Title" bind:value={panelName} />
            <Input label="Footer Author Label" bind:value={labelMadeBy} />
            <Input label="Discord Community Link" bind:value={discordLink} />
            <Input label="GitHub Repository" bind:value={githubLink} />
            <div class="save-row">
              <Button variant="primary" onclick={handleSaveGeneral}>Save Settings</Button>
            </div>
          </div>
        </div>
      {:else if activeTab === 'users'}
        <div class="pane-content">
          <h3 class="pane-title">Authorized Accounts</h3>
          <div class="users-table-box">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="font-mono">nandu (Master)</td>
                  <td><Badge variant="success" size="sm">Owner</Badge></td>
                  <td><span class="text-accent">Configured via settings.json</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      {:else if activeTab === 'oauth'}
        <div class="pane-content">
          <h3 class="pane-title">OAuth Providers</h3>
          <p class="pane-desc">Enable third-party OAuth logins via settings.json</p>
          <div class="oauth-status-list">
            <div class="oauth-item">
              <span>Discord OAuth</span>
              <Badge variant="default" size="sm">Disabled</Badge>
            </div>
            <div class="oauth-item">
              <span>Google OAuth</span>
              <Badge variant="default" size="sm">Disabled</Badge>
            </div>
          </div>
        </div>
      {:else if activeTab === 'backups'}
        <div class="pane-content">
          <h3 class="pane-title">Automated System Backups</h3>
          <p class="pane-desc">Snapshot core database and container configurations.</p>
          <Button variant="secondary" icon={HardDrive} onclick={() => addToast('Snapshot created', 'success')}>
            Take Snapshot Now
          </Button>
        </div>
      {:else if activeTab === 'about'}
        <div class="pane-content">
          <h3 class="pane-title">Hex System Overview</h3>
          <div class="about-grid">
            <div class="about-row">
              <span class="about-key">Hex Panel Version</span>
              <span class="about-val font-mono">v0.1.0</span>
            </div>
            <div class="about-row">
              <span class="about-key">Hex Core API</span>
              <span class="about-val font-mono">v0.1.0 (Connected)</span>
            </div>
            <div class="about-row">
              <span class="about-key">License</span>
              <span class="about-val">MIT Open Source</span>
            </div>
            <div class="about-row">
              <span class="about-key">Repository</span>
              <a href={githubLink} target="_blank" class="about-val text-accent">{githubLink}</a>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .settings-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .settings-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: var(--space-5);
  }

  .settings-tabs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-2);
    height: fit-content;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 10px 14px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    transition: all var(--transition-fast);
    text-align: left;
  }

  .tab-btn:hover {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }

  .tab-btn.is-active {
    background: var(--accent-subtle);
    color: var(--accent);
    font-weight: 500;
  }

  .tab-pane {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow-card);
  }

  .pane-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .pane-title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
  }

  .pane-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .fields-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 480px;
  }

  .save-row {
    margin-top: var(--space-2);
  }

  .users-table-box {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .users-table th {
    text-align: left;
    padding: 10px 14px;
    background: var(--bg-elevated);
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
  }

  .users-table td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .oauth-status-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-width: 400px;
  }

  .oauth-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .about-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 500px;
  }

  .about-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-subtle);
    font-size: var(--text-sm);
  }

  .about-key {
    color: var(--text-secondary);
  }

  .about-val {
    color: var(--text-primary);
  }

  .text-accent { color: var(--accent); }
  .font-mono { font-family: var(--font-mono); }
</style>
