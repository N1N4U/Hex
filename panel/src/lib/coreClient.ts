// src/lib/coreClient.ts
// This utility handles secure communication between the Panel and the Core Node.

// For development purposes, we allow self-signed certificates.
// In a true production environment with proper CA setup, this should be removed.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface CoreNode {
  ip: string;
  port: number;
  protocol?: string;
  apiKey: string;
}

export async function checkNodeHealth(node: CoreNode): Promise<{ success: boolean; error?: string }> {
  try {
    const protocol = node.protocol || 'https';
    const url = `${protocol}://${node.ip}:${node.port}/health`;
    
    // We pass the API Key in the Authorization header as a Bearer token
    // (though Hex Core currently might just check it directly)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${node.apiKey}`,
        'Content-Type': 'application/json'
      },
      // Short timeout so the UI doesn't hang forever if the node is unreachable
      signal: AbortSignal.timeout(5000) 
    });

    if (response.ok) {
      return { success: true };
    }
    
    let errorMsg = `Health check failed with status: ${response.status}`;
    try {
      const text = await response.text();
      if (text) errorMsg = text.trim();
    } catch (e) {
      // Ignore text parse errors
    }
    
    console.warn(`Node ${node.ip} health check failed with status: ${response.status} - ${errorMsg}`);
    return { success: false, error: errorMsg };
  } catch (error: any) {
    console.error(`Error connecting to node ${node.ip}:`, error);
    return { success: false, error: error.message || error.toString() };
  }
}

export async function coreFetch(node: CoreNode, path: string, options?: RequestInit): Promise<Response> {
  const protocol = node.protocol || 'https';
  // Ensure path starts with a slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  const url = `${protocol}://${node.ip}:${node.port}${path}`;
  
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${node.apiKey}`,
    },
    // Don't want the UI hanging forever
    signal: options?.signal || AbortSignal.timeout(10000)
  });
}
