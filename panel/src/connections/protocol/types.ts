export interface WSMessage {
  id?: string;
  type: string;
  payload?: any;
  error?: string;
  target_core_id?: string;
  core_id?: string;
}

export interface WSEvent {
  type: string;
  payload: any;
}

// Typed Events we support for now
export enum CoreEventTypes {
  AUTH = 'auth',
  PING = 'ping',
  PONG = 'pong',
  STATS_SUBSCRIBE = 'stats.subscribe',
  STATS_UPDATE = 'stats.update',
}
