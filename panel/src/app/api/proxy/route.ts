import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { coreClient } from '@/lib/coreClient';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domain, targetUrl, enableSsl } = body;

    if (!domain || !targetUrl) {
      return NextResponse.json({ error: 'Domain and target URL are required' }, { status: 400 });
    }

    // Forward the proxy creation request to the Core
    const coreResponse = await coreClient.post('/proxy', {
      domain,
      targetUrl,
      enableSsl: !!enableSsl,
    });

    return NextResponse.json({ success: true, coreResponse }, { status: 201 });
  } catch (error: any) {
    console.error('Proxy API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
