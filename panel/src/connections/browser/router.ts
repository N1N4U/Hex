import { BrowserClient } from './manager';
import { WSMessage, CoreEventTypes } from '../protocol/types';
import { authenticateBrowserClient } from './auth';
import { coreManager } from '../core/manager';

export async function handleBrowserMessage(client: BrowserClient, rawMessage: string) {
  let msg: WSMessage;
  try {
    msg = JSON.parse(rawMessage);
  } catch (e) {
    client.ws.send(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  // Handle Authentication
  if (msg.type === CoreEventTypes.AUTH) {
    const success = await authenticateBrowserClient(msg.payload?.token || msg['token' as keyof typeof msg]);
    if (success) {
      client.isAuthenticated = true;
      client.ws.send(JSON.stringify({ id: msg.id, type: CoreEventTypes.AUTH, success: true }));
    } else {
      client.ws.send(JSON.stringify({ id: msg.id, type: CoreEventTypes.AUTH, error: 'Authentication failed' }));
      client.ws.close();
    }
    return;
  }

  if (!client.isAuthenticated) {
    client.ws.send(JSON.stringify({ id: msg.id, error: 'Not authenticated' }));
    return;
  }

  // Handle Ping
  if (msg.type === CoreEventTypes.PING) {
    client.ws.send(JSON.stringify({ id: msg.id, type: CoreEventTypes.PONG }));
    return;
  }

  // Route requests to specific cores based on target_core_id
  if (msg.target_core_id) {
    const coreId = msg.target_core_id.toString();
    
    // Core Manager handles auto-connecting to the core if necessary
    const coreWs = await coreManager.getOrConnectCore(coreId);
    
    if (!coreWs) {
      client.ws.send(JSON.stringify({ id: msg.id, error: `Could not connect to Core ${coreId}` }));
      return;
    }

    // Forward to Core
    coreWs.send(rawMessage);
  } else {
    // Panel-level requests
    client.ws.send(JSON.stringify({ id: msg.id, error: 'No target_core_id specified' }));
  }
}
