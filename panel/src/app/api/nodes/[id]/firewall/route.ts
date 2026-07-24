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

    const response = await coreFetch(coreNode, '/security/firewall', { method: 'GET' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch firewall from core' }, { status: response.status });
    }

    const data = await response.text();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching firewall:', error);
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

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
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

    let targetUrl = `/security/firewall?action=${action}`;
    if (port) {
      targetUrl += `&port=${encodeURIComponent(port)}`;
    }

    const response = await coreFetch(coreNode, targetUrl, { method: 'POST' });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err || 'Failed to update firewall' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating firewall:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
