import { get, post, put, del } from '../api/client';

export interface NodeInfo {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  protocol: string;
  status: 'online' | 'offline' | 'busy' | 'disabled';
  color?: string;
}

// Initialized empty - loads purely from real backend SQLite database
let nodesState = $state<NodeInfo[]>([]);
let activeNodeIdState = $state<string>('');

export const nodeStore = {
  get nodes() {
    return nodesState;
  },
  get activeNode() {
    return nodesState.find((n) => n.id === activeNodeIdState && n.status !== 'disabled') || 
           nodesState.find((n) => n.status !== 'disabled') || 
           null;
  },
  get activeId() {
    return activeNodeIdState;
  },
  setActive(id: string) {
    activeNodeIdState = id;
  },
  setNodes(newNodes: NodeInfo[]) {
    nodesState = newNodes;
  }
};

export async function loadNodes(): Promise<NodeInfo[]> {
  try {
    const list = await get<any[]>('/nodes');
    if (Array.isArray(list)) {
      const mapped: NodeInfo[] = list.map((item, idx) => ({
        id: item.id || `node-${idx}`,
        name: item.name || 'Remote Core',
        ip_address: item.ip_address || '',
        port: item.port || 8080,
        protocol: item.protocol || 'http',
        status: item.status === 'disabled' ? 'disabled' : (item.status === 'online' ? 'online' : 'offline')
      }));
      nodesState = mapped;
      const activeCandidate = mapped.find(n => n.id === activeNodeIdState && n.status !== 'disabled') ||
                              mapped.find(n => n.status !== 'disabled');
      activeNodeIdState = activeCandidate ? activeCandidate.id : '';
      return mapped;
    }
  } catch (err) {
    console.warn('Could not load nodes:', err);
  }
  return nodesState;
}

export async function addCoreNode(data: {
  name: string;
  ip_address: string;
  port: number;
  protocol: string;
  api_key: string;
}): Promise<NodeInfo> {
  const result = await post<NodeInfo>('/nodes', data);
  await loadNodes();
  return result;
}

export async function updateCoreNode(id: string, data: {
  name: string;
  ip_address: string;
  port: number;
  protocol: string;
  api_key?: string;
}): Promise<NodeInfo> {
  const result = await put<NodeInfo>('/nodes', { id, ...data });
  await loadNodes();
  return result;
}

export async function toggleCoreNode(id: string, enabled: boolean): Promise<NodeInfo | null> {
  try {
    const updated = await post<NodeInfo>('/nodes/toggle', { id, enabled });
    nodesState = nodesState.map((n) => {
      if (n.id === id) {
        return { ...n, status: enabled ? (updated.status || 'online') : 'disabled' };
      }
      return n;
    });
    if (!enabled && activeNodeIdState === id) {
      const remaining = nodesState.find(n => n.id !== id && n.status !== 'disabled');
      activeNodeIdState = remaining ? remaining.id : '';
    } else if (enabled) {
      activeNodeIdState = id;
    }
    return updated;
  } catch (err) {
    console.error('Failed to toggle node:', err);
    return null;
  }
}

export async function deleteCoreNode(id: string): Promise<boolean> {
  try {
    await del(`/nodes?id=${encodeURIComponent(id)}`);
  } catch {}
  nodesState = nodesState.filter((n) => n.id !== id);
  if (activeNodeIdState === id) {
    const remaining = nodesState.find(n => n.status !== 'disabled');
    activeNodeIdState = remaining ? remaining.id : '';
  }
  return true;
}
