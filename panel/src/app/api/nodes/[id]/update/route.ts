import { NextResponse } from 'next/server';
import { getDb } from '@/../database';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const nodeRow = await db.get('SELECT ip_address, port, protocol, api_key FROM nodes WHERE id = ?', [id]);

    if (!nodeRow) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

    const protocol = nodeRow.protocol || 'https';
    const url = `${protocol}://${nodeRow.ip_address}:${nodeRow.port}/system/update`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${nodeRow.api_key}` },
    });

    if (!response.ok) return NextResponse.json({ error: 'Failed to update core' }, { status: response.status });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
