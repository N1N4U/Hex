<script lang="ts">
  import PageHeader from '$lib/ui/layout/PageHeader.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Input from '$lib/ui/primitives/Input.svelte';
  import Badge from '$lib/ui/primitives/Badge.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { get } from '$lib/api/client';
  import { onMount } from 'svelte';
  import {
    Settings as SettingsIcon,
    Users,
    Key,
    Share2,
    Database,
    Plus,
    Trash2,
    Server,
    Shield
  } from '@lucide/svelte';

  interface ManagedUser {
    id: string;
    username: string;
    role: 'owner' | 'admin' | 'operator' | 'viewer';
    created_at: string;
  }

  let activeTab = $state<'users' | 'node' | 'oauth'>('users');

  // User management state
  let usersList = $state<ManagedUser[]>([
    { id: '1', username: 'nandu (Master)', role: 'owner', created_at: 'Configured via settings.json' },
    { id: '2', username: 'operator', role: 'operator', created_at: '2026-09-28' }
  ]);
  let newUsername = $state('');
  let newPassword = $state('');
  let newRole = $state<'admin' | 'operator' | 'viewer'>('operator');
  let showCreateUser = $state(false);

  // Node settings from settings.json
  let nodePort = $state(9000);
  let masterUsername = $state('nandu');
  let coreDbPath = $state('data/hex-core.db');
  let nodeDbPath = $state('data/hex-node.db');
  let discordAuth = $state(false);
  let googleAuth = $state(false);
  let gmailAuth = $state(false);

  onMount(async () => {
    try {
      const cfg = await get<any>('/config/public');
      if (cfg?.auth) {
        discordAuth = !!cfg.auth.discord;
        googleAuth = !!cfg.auth.google;
        gmailAuth = !!cfg.auth.gmail;
      }
    } catch {}
  });

  function handleCreateUser() {
    if (!newUsername.trim() || !newPassword.trim()) {
      addToast('Username and password are required', 'error');
      return;
    }

    const newUser: ManagedUser = {
      id: String(Date.now()),
      username: newUsername.trim(),
      role: newRole,
      created_at: new Date().toISOString().split('T')[0]
    };

    usersList = [...usersList, newUser];
    newUsername = '';
    newPassword = '';
    newRole = 'operator';
    showCreateUser = false;
    addToast(`User '${newUser.username}' created successfully`, 'success');
  }

  function handleDeleteUser(id: string) {
    if (id === '1') {
      addToast('Cannot delete master user', 'error');
      return;
    }
    usersList = usersList.filter((u) => u.id !== id);
    addToast('User deleted', 'info');
  }
</script>

<div class="settings-page">
  <PageHeader
    title="Panel Settings"
    description="Manage system users, access control, and node-level configurations"
  />

  <div class="settings-layout">
    <!-- Tabs Nav -->
    <div class="settings-tabs">
      <button
        class="tab-btn"
        class:is-active={activeTab === 'users'}
        onclick={() => (activeTab = 'users')}
      >
        <Users size={16} /> User Management
      </button>

      <button
        class="tab-btn"
        class:is-active={activeTab === 'node'}
        onclick={() => (activeTab = 'node')}
      >
        <Server size={16} /> Node Configuration
      </button>

      <button
        class="tab-btn"
        class:is-active={activeTab === 'oauth'}
        onclick={() => (activeTab = 'oauth')}
      >
        <Share2 size={16} /> Auth & Providers
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-pane">
      {#if activeTab === 'users'}
        <div class="pane-content">
          <div class="pane-header-row">
            <div>
              <h3 class="pane-title">Authorized Users</h3>
              <p class="pane-desc">Create and manage accounts authorized to access Hex Node.</p>
            </div>
            <Button variant="primary" size="sm" icon={Plus} onclick={() => (showCreateUser = !showCreateUser)}>
              {showCreateUser ? 'Cancel' : 'Add User'}
            </Button>
          </div>

          {#if showCreateUser}
            <div class="create-user-card">
              <h4 class="card-title">Create New Account</h4>
              <div class="fields-grid">
                <Input label="Username" bind:value={newUsername} placeholder="e.g. alex" />
                <Input label="Password" type="password" bind:value={newPassword} placeholder="????????" />
                <div class="role-field">
                  <label class="field-label" for="role-sel">Role</label>
                  <select id="role-sel" bind:value={newRole} class="role-select">
                    <option value="admin">Admin (Full Control)</option>
                    <option value="operator">Operator (Deploy & Manage)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                </div>
              </div>
              <div class="card-actions">
                <Button variant="ghost" size="sm" onclick={() => (showCreateUser = false)}>Cancel</Button>
                <Button variant="primary" size="sm" onclick={handleCreateUser}>Create User</Button>
              </div>
            </div>
          {/if}

          <div class="users-table-box">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {#each usersList as u (u.id)}
                  <tr>
                    <td class="font-mono user-col">{u.username}</td>
                    <td>
                      <Badge variant={u.role === 'owner' ? 'success' : u.role === 'admin' ? 'info' : 'default'} size="sm">
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td class="text-muted">{u.created_at}</td>
                    <td>
                      {#if u.id !== '1'}
                        <button class="delete-icon-btn" onclick={() => handleDeleteUser(u.id)} title="Delete User">
                          <Trash2 size={14} />
                        </button>
                      {:else}
                        <span class="text-muted">Protected</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else if activeTab === 'node'}
        <div class="pane-content">
          <h3 class="pane-title">Node & Database Settings</h3>
          <p class="pane-desc">System configuration loaded from settings.json.</p>

          <div class="node-specs-grid">
            <div class="spec-card">
              <span class="spec-label">HTTP Port</span>
              <span class="spec-val font-mono">{nodePort}</span>
            </div>
            <div class="spec-card">
              <span class="spec-label">Master Account</span>
              <span class="spec-val font-mono">{masterUsername}</span>
            </div>
            <div class="spec-card">
              <span class="spec-label">Core Database</span>
              <span class="spec-val font-mono">{coreDbPath}</span>
            </div>
            <div class="spec-card">
              <span class="spec-label">Node Database</span>
              <span class="spec-val font-mono">{nodeDbPath}</span>
            </div>
          </div>
        </div>
      {:else if activeTab === 'oauth'}
        <div class="pane-content">
          <h3 class="pane-title">Authentication Providers</h3>
          <p class="pane-desc">Status of configured login mechanisms in settings.json.</p>
          <div class="oauth-status-list">
            <div class="oauth-item">
              <span class="provider-title">Master Credentials</span>
              <Badge variant="success" size="sm">Enabled</Badge>
            </div>
            <div class="oauth-item">
              <span class="provider-title">Discord OAuth</span>
              <Badge variant={discordAuth ? 'success' : 'default'} size="sm">
                {discordAuth ? 'Enabled' : 'Disabled in settings.json'}
              </Badge>
            </div>
            <div class="oauth-item">
              <span class="provider-title">Google OAuth</span>
              <Badge variant={googleAuth ? 'success' : 'default'} size="sm">
                {googleAuth ? 'Enabled' : 'Disabled in settings.json'}
              </Badge>
            </div>
            <div class="oauth-item">
              <span class="provider-title">Gmail SMTP Auth</span>
              <Badge variant={gmailAuth ? 'success' : 'default'} size="sm">
                {gmailAuth ? 'Enabled' : 'Disabled in settings.json'}
              </Badge>
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
    gap: 16px;
    font-family: var(--font-sans);
  }

  .settings-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 20px;
  }

  .settings-tabs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: rgba(12, 16, 22, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-lg);
    padding: 8px;
    height: fit-content;
    backdrop-filter: blur(16px);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-size: 13.5px;
    font-weight: 500;
    transition: all 120ms ease;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .tab-btn.is-active {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-weight: 600;
  }

  .tab-pane {
    background: rgba(12, 16, 22, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 10px 30px rgba(0, 0, 0, 0.45);
    border-radius: var(--radius-lg);
    padding: 24px;
    backdrop-filter: blur(20px);
  }

  .pane-header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .pane-title {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
  }

  .pane-desc {
    font-size: 13px;
    color: #94a3b8;
    margin: 4px 0 0 0;
  }

  .create-user-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .card-title {
    font-size: 14px;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0;
  }

  .fields-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .role-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
  }

  .role-select {
    height: 40px;
    background: #1a202c;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 0 10px;
    color: #ffffff;
    font-size: 13px;
    outline: none;
    cursor: pointer;
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .users-table-box {
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    overflow: hidden;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .users-table th {
    text-align: left;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    font-weight: 600;
  }

  .users-table td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
  }

  .user-col {
    color: #ffffff;
    font-weight: 500;
  }

  .delete-icon-btn {
    background: transparent;
    border: none;
    color: #f87171;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background 120ms ease;
  }

  .delete-icon-btn:hover {
    background: rgba(239, 68, 68, 0.15);
  }

  .node-specs-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-top: 16px;
  }

  .spec-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .spec-label {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
  }

  .spec-val {
    font-size: 14px;
    color: #ffffff;
    font-weight: 600;
  }

  .oauth-status-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 16px;
  }

  .oauth-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }

  .provider-title {
    font-size: 13.5px;
    color: #f1f5f9;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .settings-layout {
      grid-template-columns: 1fr;
    }
    .fields-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
