import { NextResponse } from 'next/server';
import { getDb } from '@/../database';
import { CoreNode } from '@/lib/coreClient';

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

    const protocol = nodeRow.protocol || 'https';
    const url = `${protocol}://${nodeRow.ip_address}:${nodeRow.port}/stats/stream`;

    // Fetch the SSE stream from the core
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${nodeRow.api_key}`,
      }
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Failed to connect to core stream' }, { status: response.status || 500 });
    }

    // Proxy the stream to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in SSE stream:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
