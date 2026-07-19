import { NextResponse } from 'next/server';
import { getDb } from '@/../database';

// Helper to make requests to the Core
async function fetchCore(nodeId: number, path: string, method: string = 'GET', body: any = null) {
  const db = await getDb();
  const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
  
  if (!node) throw new Error("Node not found");

  const url = `https://${node.ip_address}:${node.port}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${node.api_key}`,
      'Content-Type': 'application/json'
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  // Bypass TLS for local dev
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Core responded with ${res.status}`);
  }
  return res.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get('nodeId');
  
  if (!nodeId) return NextResponse.json({ error: 'nodeId required' }, { status: 400 });

  try {
    const data = await fetchCore(parseInt(nodeId), '/docker/containers');
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nodeId, name, image, ports, env, command } = body;
    
    if (!nodeId || !name || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = await fetchCore(parseInt(nodeId), '/docker/create', 'POST', {
      name,
      image,
      ports: ports || {},
      env: env || [],
      command: command || []
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
