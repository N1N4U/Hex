import { get, post, del } from '../api/client';

export interface NodeInfo {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  protocol: string;
  status: 'online' | 'offline' | 'busy';
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
    return nodesState.find((n) => n.id === activeNodeIdState) || nodesState[0] || null;
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
        status: item.status === 'online' ? 'online' : 'offline'
      }));
      nodesState = mapped;
      if (mapped.length > 0 && (!activeNodeIdState || !nodesState.some(n => n.id === activeNodeIdState))) {
        activeNodeIdState = mapped[0].id;
      }
      return mapped;
    }
  } catch {
    nodesState = [];
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

export async function deleteCoreNode(id: string): Promise<boolean> {
  try {
    await del(`/nodes?id=${encodeURIComponent(id)}`);
  } catch {}
  nodesState = nodesState.filter((n) => n.id !== id);
  if (activeNodeIdState === id) {
    activeNodeIdState = nodesState.length > 0 ? nodesState[0].id : '';
  }
  return true;
}
