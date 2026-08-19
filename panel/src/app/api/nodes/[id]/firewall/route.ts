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

    const response = await coreFetch(coreNode, '/firewall', { method: 'GET' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch firewall rules from core' }, { status: response.status });
    }

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching firewall rules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const port = url.searchParams.get('port');
    
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

    const targetUrl = port ? `/firewall?action=${action}&port=${port}` : `/firewall?action=${action}`;
    const response = await coreFetch(coreNode, targetUrl, { method: 'POST' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to update firewall on core' }, { status: response.status });
    }

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { message: text }; }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating firewall:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
