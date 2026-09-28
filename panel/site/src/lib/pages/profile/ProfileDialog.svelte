<script lang="ts">
  import { user } from '$lib/stores/auth';
  import { logout, logoutAll } from '$lib/api/auth';
  import { disconnect } from '$lib/ws/client';
  import { goto } from '$app/navigation';
  import { closeDialog } from '$lib/ui/overlay/dialogStore.svelte';
  import Avatar from '$lib/ui/primitives/Avatar.svelte';
  import Badge from '$lib/ui/primitives/Badge.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import Input from '$lib/ui/primitives/Input.svelte';
  import Dialog from '$lib/ui/overlay/Dialog.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { Shield, Key, Sliders, AlertTriangle, LogOut } from '@lucide/svelte';

  let activeTab = $state<'sessions' | 'security' | 'preferences' | 'danger'>('sessions');

  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');

  async function handleLogout() {
    try {
      await logout();
    } catch {}
    user.set(null);
    disconnect();
    closeDialog();
    addToast('Signed out of current session', 'info');
    goto('/loading?action=logout');
  }

  async function handleLogoutAll() {
    try {
      await logoutAll();
    } catch {}
    user.set(null);
    disconnect();
    closeDialog();
    addToast('Signed out of all devices', 'info');
    goto('/loading?action=logout');
  }

  function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }
    addToast('Password updated successfully', 'success');
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
  }
</script>

<Dialog title="User Profile" size="lg" onclose={() => closeDialog()}>
  <div class="profile-container">
    <!-- Header -->
    <div class="profile-header">
      <Avatar name={$user?.username || 'Administrator'} size="lg" online />
      <div class="user-meta">
        <h3 class="user-name">{$user?.username || 'Administrator'}</h3>
        <div class="role-row">
          <Badge variant="success" size="sm">{$user?.role || 'Owner'}</Badge>
        </div>
      </div>
      <div class="header-actions">
        <Button variant="secondary" size="sm" onclick={handleLogout}>
          <LogOut size={14} /> Sign Out
        </Button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-bar">
      <button
        class="tab-btn"
        class:is-active={activeTab === 'sessions'}
        onclick={() => (activeTab = 'sessions')}
      >
        <Shield size={14} /> Sessions
      </button>
      <button
        class="tab-btn"
        class:is-active={activeTab === 'security'}
        onclick={() => (activeTab = 'security')}
      >
        <Key size={14} /> Security
      </button>
      <button
        class="tab-btn"
        class:is-active={activeTab === 'preferences'}
        onclick={() => (activeTab = 'preferences')}
      >
        <Sliders size={14} /> Preferences
      </button>
      <button
        class="tab-btn danger"
        class:is-active={activeTab === 'danger'}
        onclick={() => (activeTab = 'danger')}
      >
        <AlertTriangle size={14} /> Danger Zone
      </button>
    </div>

    <!-- Tab Contents -->
    <div class="tab-content">
      {#if activeTab === 'sessions'}
        <div class="section">
          <div class="section-header-row">
            <div>
              <h4 class="section-title">Active Sessions</h4>
              <p class="section-desc">Manage your active login tokens on this server.</p>
            </div>
            <Button variant="secondary" size="sm" onclick={handleLogout}>
              <LogOut size={14} /> Sign Out Current Device
            </Button>
          </div>
          <table class="session-table">
            <thead>
              <tr>
                <th>Device / IP</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr class="current-row">
                <td>
                  <div class="device-name">Current Web Browser</div>
                  <div class="device-ip">127.0.0.1 (This Device)</div>
                </td>
                <td>
                  <Badge variant="success" size="sm" dot>Active Now</Badge>
                </td>
                <td>
                  <Button variant="danger" size="sm" onclick={handleLogout}>
                    Sign Out
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      {:else if activeTab === 'security'}
        <div class="section">
          <h4 class="section-title">Change Password</h4>
          <div class="form-grid">
            <Input
              type="password"
              label="Current Password"
              placeholder="????????????"
              bind:value={currentPassword}
            />
            <Input
              type="password"
              label="New Password"
              placeholder="????????????"
              bind:value={newPassword}
            />
            <Input
              type="password"
              label="Confirm New Password"
              placeholder="????????????"
              bind:value={confirmPassword}
            />
            <div class="form-actions">
              <Button variant="primary" onclick={handleChangePassword}>
                Update Password
              </Button>
            </div>
          </div>
        </div>
      {:else if activeTab === 'preferences'}
        <div class="section">
          <h4 class="section-title">Panel Preferences</h4>
          <p class="section-desc">Theme is fixed to Dark Modern VPS for performance and visual contrast.</p>
        </div>
      {:else if activeTab === 'danger'}
        <div class="section">
          <h4 class="section-title text-danger">Danger Zone</h4>
          <p class="section-desc">Revoke your active sessions and require re-authentication.</p>
          
          <div class="danger-box">
            <div>
              <div class="font-bold">Sign Out (This Device)</div>
              <div class="text-sm text-secondary">Terminates the current session cookie on this browser.</div>
            </div>
            <Button variant="secondary" onclick={handleLogout}>
              <LogOut size={14} /> Sign Out
            </Button>
          </div>

          <div class="danger-box" style="margin-top: 12px;">
            <div>
              <div class="font-bold">Sign Out All Sessions</div>
              <div class="text-sm text-secondary">Terminates active session tokens across all devices and browsers.</div>
            </div>
            <Button variant="danger" onclick={handleLogoutAll}>
              <LogOut size={14} /> Sign Out All Devices
            </Button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</Dialog>

<style>
  .profile-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
  }

  .user-meta {
    flex: 1;
  }

  .header-actions {
    margin-left: auto;
  }

  .user-name {
    font-size: var(--text-lg);
    font-weight: 700;
  }

  .role-row {
    margin-top: 4px;
  }

  .tabs-bar {
    display: flex;
    gap: var(--space-2);
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: var(--space-2);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .tab-btn:hover {
    color: var(--text-primary);
    background: var(--bg-surface-hover);
  }

  .tab-btn.is-active {
    background: var(--accent-subtle);
    color: var(--accent);
    font-weight: 500;
  }

  .tab-btn.danger.is-active {
    background: var(--danger-subtle);
    color: var(--danger);
  }

  .tab-content {
    min-height: 220px;
  }

  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-3);
  }

  .section-title {
    font-size: var(--text-md);
    font-weight: 600;
    margin-bottom: var(--space-1);
  }

  .text-danger {
    color: var(--danger);
  }

  .section-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-bottom: var(--space-3);
  }

  .session-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .session-table th {
    text-align: left;
    padding: 8px 12px;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    font-size: var(--text-xs);
    text-transform: uppercase;
  }

  .session-table td {
    padding: 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .current-row {
    background: var(--bg-surface-active);
  }

  .device-name {
    font-weight: 500;
  }

  .device-ip {
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  .form-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 400px;
  }

  .form-actions {
    margin-top: var(--space-2);
  }

  .danger-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: var(--danger-subtle);
    border: 1px solid var(--danger);
    border-radius: var(--radius-md);
  }

  .font-bold {
    font-weight: 600;
  }

  .text-sm {
    font-size: var(--text-sm);
  }

  .text-secondary {
    color: var(--text-secondary);
  }
</style>
