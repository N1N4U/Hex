// src/lib/coreClient.ts
// This utility handles secure communication between the Panel and the Core Node.

// For development purposes, we allow self-signed certificates.
// In a true production environment with proper CA setup, this should be removed.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface CoreNode {
  ip: string;
  port: number;
  apiKey: string;
}

export async function checkNodeHealth(node: CoreNode): Promise<boolean> {
  try {
    const url = `https://${node.ip}:${node.port}/health`;
    
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
      return true;
    }
    
    console.warn(`Node ${node.ip} health check failed with status: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`Error connecting to node ${node.ip}:`, error);
    return false;
  }
}
