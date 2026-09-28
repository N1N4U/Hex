import { get } from '../api/client';

export interface NodeInfo {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  protocol: string;
  status: 'online' | 'offline' | 'busy';
  color: string;
}

const DEFAULT_LOCAL_NODE: NodeInfo = {
  id: 'local',
  name: 'Local VPS',
  ip_address: '127.0.0.1',
  port: 8080,
  protocol: 'http',
  status: 'online',
  color: '#00ff88'
};

const nodeColors = ['#00ff88', '#4d9fff', '#f5c518', '#a855f7', '#ec4899', '#06b6d4'];

let nodesState = $state<NodeInfo[]>([DEFAULT_LOCAL_NODE]);
let activeNodeIdState = $state<string>('local');

export const nodeStore = {
  get nodes() {
    return nodesState;
  },
  get activeNode() {
    return nodesState.find((n) => n.id === activeNodeIdState) || nodesState[0] || DEFAULT_LOCAL_NODE;
  },
  get activeId() {
    return activeNodeIdState;
  },
  setActive(id: string) {
    activeNodeIdState = id;
  }
};

export async function loadNodes() {
  try {
    const list = await get<any[]>('/nodes');
    if (Array.isArray(list)) {
      const mapped: NodeInfo[] = list.map((item, idx) => ({
        id: item.id || `node-${idx}`,
        name: item.name || 'Remote Node',
        ip_address: item.ip_address || '',
        port: item.port || 8080,
        protocol: item.protocol || 'http',
        status: item.status || 'online',
        color: nodeColors[idx % nodeColors.length]
      }));

      // Prepend local node if not in list
      if (!mapped.some((n) => n.id === 'local')) {
        nodesState = [DEFAULT_LOCAL_NODE, ...mapped];
      } else {
        nodesState = mapped;
      }
    }
  } catch {
    // If offline or dev mode, default to local node
    nodesState = [DEFAULT_LOCAL_NODE];
  }
}
