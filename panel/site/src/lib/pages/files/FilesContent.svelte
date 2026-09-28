<script lang="ts">
  import PageHeader from '$lib/ui/layout/PageHeader.svelte';
  import Button from '$lib/ui/primitives/Button.svelte';
  import ContextMenu from '$lib/ui/overlay/ContextMenu.svelte';
  import { addToast } from '$lib/ui/feedback/toastStore.svelte';
  import { onMount } from 'svelte';
  import {
    Folder,
    File,
    Upload,
    FolderPlus,
    FilePlus,
    ChevronRight,
    Save
  } from '@lucide/svelte';

  interface FileNode {
    name: string;
    path: string;
    isDir: boolean;
    size?: string;
    modified?: string;
  }

  let currentPath = $state('/var/lib/hex');
  let selectedFile = $state<FileNode | null>(null);
  let editorContainer: HTMLDivElement | null = null;
  let monacoInstance: any = null;
  let monacoEditor: any = null;
  let fileContent = $state('');

  // Context menu state
  let contextMenuVisible = $state(false);
  let contextX = $state(0);
  let contextY = $state(0);
  let targetNode = $state<FileNode | null>(null);

  const fileTree: FileNode[] = [
    { name: 'configs', path: '/var/lib/hex/configs', isDir: true },
    { name: 'data', path: '/var/lib/hex/data', isDir: true },
    { name: 'logs', path: '/var/lib/hex/logs', isDir: true },
    { name: 'settings.json', path: '/var/lib/hex/settings.json', isDir: false, size: '1.4 KB', modified: '2 hours ago' },
    { name: 'docker-compose.yml', path: '/var/lib/hex/docker-compose.yml', isDir: false, size: '3.2 KB', modified: 'Yesterday' },
    { name: 'hex-core.log', path: '/var/lib/hex/hex-core.log', isDir: false, size: '24.1 KB', modified: 'Just now' }
  ];

  onMount(async () => {
    // Dynamic import of Monaco Editor only when on this page
    try {
      if (typeof window !== 'undefined' && !(window as any).MonacoEnvironment) {
        (window as any).MonacoEnvironment = {
          getWorkerUrl: function () {
            return 'data:text/javascript;charset=utf-8,';
          }
        };
      }
      monacoInstance = await import('monaco-editor');
      if (editorContainer) {
        initEditor();
      }
    } catch {
      // fallback
    }

    return () => {
      if (monacoEditor) {
        monacoEditor.dispose();
      }
    };
  });

  function initEditor() {
    if (!editorContainer || !monacoInstance) return;

    monacoEditor = monacoInstance.editor.create(editorContainer, {
      value: fileContent || '{\n  "panel": "Hex Panel",\n  "port": 9000\n}',
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      minimap: { enabled: false },
      scrollBeyondLastLine: false
    });
  }

  function handleFileClick(node: FileNode) {
    if (node.isDir) {
      currentPath = node.path;
    } else {
      selectedFile = node;
      fileContent = `// Contents of ${node.name}\n{\n  "name": "${node.name}",\n  "path": "${node.path}"\n}`;
      if (monacoEditor) {
        monacoEditor.setValue(fileContent);
      }
    }
  }

  function handleContextMenu(e: MouseEvent, node: FileNode) {
    e.preventDefault();
    targetNode = node;
    contextX = e.clientX;
    contextY = e.clientY;
    contextMenuVisible = true;
  }

  function handleSave() {
    if (monacoEditor) {
      const val = monacoEditor.getValue();
      addToast(`Saved ${selectedFile?.name || 'file'} successfully`, 'success');
    }
  }
</script>

<div class="files-page">
  <PageHeader title="File Manager" description="Browse, edit, and manage filesystem trees">
    {#snippet actions()}
      <Button variant="secondary" icon={Upload} onclick={() => addToast('Upload dialog opened', 'info')}>
        Upload
      </Button>
      <Button variant="secondary" icon={FolderPlus} onclick={() => addToast('New folder created', 'info')}>
        New Folder
      </Button>
      <Button variant="primary" icon={FilePlus} onclick={() => addToast('New file created', 'info')}>
        New File
      </Button>
    {/snippet}
  </PageHeader>

  <!-- Path Breadcrumb -->
  <div class="path-bar">
    <span class="path-label">Current:</span>
    <span class="path-value">{currentPath}</span>
    {#if selectedFile}
      <ChevronRight size={14} class="text-muted" />
      <span class="active-file">{selectedFile.name}</span>
    {/if}
  </div>

  <div class="files-layout">
    <!-- Left tree -->
    <div class="tree-panel">
      <div class="tree-header">
        <span class="tree-title">Explorer</span>
      </div>
      <div class="nodes-list">
        {#each fileTree as node}
          <div
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === "Enter") handleSelectNode(node); }}
            class="tree-node"
            class:is-active={selectedFile?.path === node.path}
            onclick={() => handleFileClick(node)}
            oncontextmenu={(e) => handleContextMenu(e, node)}
          >
            {#if node.isDir}
              <Folder size={16} class="node-icon folder-icon" />
            {:else}
              <File size={16} class="node-icon file-icon" />
            {/if}
            <span class="node-name">{node.name}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Right: Monaco Editor or Details -->
    <div class="editor-panel">
      <div class="editor-toolbar">
        <span class="file-tab">
          {selectedFile?.name || 'settings.json'}
        </span>
        <Button variant="primary" size="sm" icon={Save} onclick={handleSave}>
          Save
        </Button>
      </div>
      <div class="monaco-wrapper" bind:this={editorContainer}></div>
    </div>
  </div>
</div>

{#if contextMenuVisible && targetNode}
  <ContextMenu
    x={contextX}
    y={contextY}
    onclose={() => (contextMenuVisible = false)}
    items={[
      { label: 'Open', action: () => handleFileClick(targetNode!) },
      { label: 'Download', action: () => addToast('Downloading ' + targetNode!.name, 'info') },
      { label: 'Copy Path', action: () => addToast('Path copied to clipboard', 'success') },
      { label: 'Delete', danger: true, action: () => addToast('Deleted ' + targetNode!.name, 'warning') }
    ]}
  />
{/if}

<style>
  .files-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    height: 100%;
  }

  .path-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    padding: 8px 14px;
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
  }

  .path-label {
    color: var(--text-muted);
  }

  .path-value {
    color: var(--text-primary);
  }

  .active-file {
    color: var(--accent);
    font-weight: 600;
  }

  .files-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: var(--space-4);
    min-height: 520px;
    height: calc(100vh - 220px);
  }

  .tree-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tree-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .tree-title {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .nodes-list {
    display: flex;
    flex-direction: column;
    padding: 6px;
    overflow-y: auto;
  }

  .tree-node {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .tree-node:hover {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }

  .tree-node.is-active {
    background: var(--accent-subtle);
    color: var(--accent);
    font-weight: 500;
  }

  

  .editor-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
  }

  .file-tab {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-weight: 500;
  }

  .monaco-wrapper {
    flex: 1;
    width: 100%;
    min-height: 400px;
    background: #1e1e1e;
  }
</style>
