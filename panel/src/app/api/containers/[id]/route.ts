import { NextResponse } from 'next/server';
import { getDb } from '@/../database';

async function fetchCore(nodeId: number, path: string, method: string = 'GET') {
  const db = await getDb();
  const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
  if (!node) throw new Error("Node not found");

  const url = `https://${node.ip_address}:${node.port}${path}`;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const res = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${node.api_key}` },
  });
  
  if (!res.ok) throw new Error(`Core responded with ${res.status}`);
  return res.json();
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { nodeId, action } = body;
    
    if (!nodeId || !action) {
      return NextResponse.json({ error: 'nodeId and action required' }, { status: 400 });
    }

    const data = await fetchCore(parseInt(nodeId), `/docker/action?id=${params.id}&action=${action}`, 'POST');
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
