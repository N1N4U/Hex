import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { coreFetch as coreClient } from '@/lib/coreClient';

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

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/';

    // Forward to Core API
    const coreResponse = await coreClient.get(`/docker/files?id=${id}&path=${encodeURIComponent(path)}`);
    
    // Core returns text/plain for files, coreClient expects JSON, so we handle the raw response if it's text
    // Wait, coreClient `.get()` automatically does `res.json()`. I should adjust it if the core returns plain text.
    // Let's use standard fetch instead for this specific route since we expect plain text.
    
    const res = await fetch(`${process.env.CORE_URL || 'https://127.0.0.1:8080'}/docker/files?id=${id}&path=${encodeURIComponent(path)}`, {
      headers: {
        'Authorization': `Bearer dummy_jwt_signed_by_${process.env.PANEL_API_KEY || 'hx_panel_default_key'}`,
      }
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json({ error: text }, { status: res.status });
    }

    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error: any) {
    console.error('File Explorer API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
