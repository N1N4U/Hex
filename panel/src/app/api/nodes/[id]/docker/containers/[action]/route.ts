import { NextResponse } from 'next/server';
import { getDb } from '@/../database';
import { coreFetch, CoreNode } from '@/lib/coreClient';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string, action: string }> }
) {
  try {
    const { id, action } = await params;
    const url = new URL(request.url);
    const containerId = url.searchParams.get('containerId');

    if (!containerId) {
      return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const nodeRow = await db.get('SELECT ip_address, port, protocol, api_key FROM nodes WHERE id = ?', [Number(id)]);

    if (!nodeRow) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const coreNode: CoreNode = {
      ip: nodeRow.ip_address,
      port: nodeRow.port,
      protocol: nodeRow.protocol,
      apiKey: nodeRow.api_key
    };

    const response = await coreFetch(coreNode, `/docker/containers?action=${action}&id=${containerId}`, { method: 'POST' });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err || 'Failed to execute container action' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error executing container action:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
