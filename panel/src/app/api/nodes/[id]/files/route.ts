import { NextResponse } from 'next/server';
import { getDb } from '@/../database';
import { coreFetch, CoreNode } from '@/lib/coreClient';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '/';
    const action = url.searchParams.get('action') || 'list';

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

    const response = await coreFetch(coreNode, `/files?path=${encodeURIComponent(path)}&action=${action}`, { method: 'GET' });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch files from core' }, { status: response.status });
    }

    if (action === 'read') {
      const text = await response.text();
      return new NextResponse(text, {
        headers: { 'Content-Type': response.headers.get('Content-Type') || 'text/plain' }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching node files:', error);
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
    const path = url.searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
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

    const body = await request.text();
    const response = await coreFetch(coreNode, `/files?path=${encodeURIComponent(path)}`, { 
      method: 'POST',
      body
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to write file to core' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing node file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
