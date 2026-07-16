import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { coreClient } from '@/lib/coreClient';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await coreClient.get('/firewall');
    return NextResponse.json(res);
  } catch (error: any) {
    console.error('Firewall API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { port, action } = body;

    if (!port || !action) {
      return NextResponse.json({ error: 'Port and action are required' }, { status: 400 });
    }

    const res = await coreClient.post('/firewall', { port, action });
    return NextResponse.json(res);
  } catch (error: any) {
    console.error('Firewall API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
