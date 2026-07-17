import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await fetch(`${process.env.CORE_URL || 'https://127.0.0.1:8080'}/deployments/env?id=${id}`, {
      headers: {
        'Authorization': `Bearer dummy_jwt_signed_by_${process.env.PANEL_API_KEY || 'hx_panel_default_key'}`,
      }
    });

    const text = await res.text();
    return new NextResponse(text, { headers: { 'Content-Type': 'text/plain' } });
  } catch (error: any) {
    console.error('Env API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bodyText = await request.text();

    const res = await fetch(`${process.env.CORE_URL || 'https://127.0.0.1:8080'}/deployments/env?id=${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer dummy_jwt_signed_by_${process.env.PANEL_API_KEY || 'hx_panel_default_key'}`,
        'Content-Type': 'text/plain'
      },
      body: bodyText
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText }, { status: res.status });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Env API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
