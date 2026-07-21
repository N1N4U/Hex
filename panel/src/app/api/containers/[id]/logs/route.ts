import { NextResponse } from 'next/server';
import { getDb } from '@/../database';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get('nodeId');
  if (!nodeId) return new Response('nodeId required', { status: 400 });

  const db = await getDb();
  const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
  if (!node) return new Response('Node not found', { status: 404 });

  const { id } = await params;
  const url = `https://${node.ip_address}:${node.port}/docker/logs?id=${id}&token=${node.api_key}`;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${node.api_key}` },
  });

  if (!res.ok) {
    return new Response(`Core error: ${res.status}`, { status: res.status });
  }

  // Create a TransformStream to pass the response body directly to the client as SSE
  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
