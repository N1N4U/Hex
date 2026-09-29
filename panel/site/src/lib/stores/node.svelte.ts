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

const DEFAULT_CORES: NodeInfo[] = [
  {
    id: 'core-mine',
    name: 'Mine',
    ip_address: '127.0.0.1',
    port: 8080,
    protocol: 'http',
    status: 'online'
  },
  {
    id: 'core-test',
    name: 'Test',
    ip_address: '192.168.1.42',
    port: 8080,
    protocol: 'http',
    status: 'offline'
  }
];

let nodesState = $state<NodeInfo[]>(DEFAULT_CORES);
let activeNodeIdState = $state<string>('core-mine');

export const nodeStore = {
  get nodes() {
    return nodesState;
  },
  get activeNode() {
    return nodesState.find((n) => n.id === activeNodeIdState) || nodesState[0] || DEFAULT_CORES[0];
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
    if (Array.isArray(list) && list.length > 0) {
      const mapped: NodeInfo[] = list.map((item, idx) => ({
        id: item.id || `node-${idx}`,
        name: item.name || 'Remote Core',
        ip_address: item.ip_address || '',
        port: item.port || 8080,
        protocol: item.protocol || 'http',
        status: item.status === 'online' ? 'online' : 'offline'
      }));
      nodesState = mapped;
      if (!nodesState.some(n => n.id === activeNodeIdState)) {
        activeNodeIdState = nodesState[0].id;
      }
      return mapped;
    }
  } catch {
    // If backend nodes table is empty or dev offline, keep fallback
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
  if (activeNodeIdState === id && nodesState.length > 0) {
    activeNodeIdState = nodesState[0].id;
  }
  return true;
}
