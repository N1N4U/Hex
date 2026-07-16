import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { coreClient } from '@/lib/coreClient';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await coreClient.get('/databases');
    return NextResponse.json(res);
  } catch (error: any) {
    console.error('Databases API error:', error);
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
    const { type, name } = body;

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
    }

    const res = await coreClient.post('/databases', { type, name });
    return NextResponse.json(res);
  } catch (error: any) {
    console.error('Databases API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
