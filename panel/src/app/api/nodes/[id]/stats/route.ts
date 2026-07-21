import { NextResponse } from 'next/server';
import { getDb } from '@/../database';
import { coreFetch, CoreNode } from '@/lib/coreClient';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const nodeRow = await db.get('SELECT ip_address, port, protocol, api_key FROM nodes WHERE id = ?', [id]);

    if (!nodeRow) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const coreNode: CoreNode = {
      ip: nodeRow.ip_address,
      port: nodeRow.port,
      protocol: nodeRow.protocol,
      apiKey: nodeRow.api_key
    };

    const response = await coreFetch(coreNode, '/stats', { method: 'GET' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch stats from core' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching node stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
