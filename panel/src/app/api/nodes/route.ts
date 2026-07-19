import { NextResponse } from 'next/server';
import { getDb } from '@/../database';
import { checkNodeHealth } from '@/lib/coreClient';

export async function GET() {
  try {
    const db = await getDb();
    const nodes = await db.all('SELECT id, name, ip_address, port, status, last_seen FROM nodes');
    return NextResponse.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, ip_address, port, protocol, api_key } = await request.json();

    if (!name || !ip_address || !api_key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const portNum = parseInt(port, 10) || 8080;
    const proto = protocol || 'https';

    // Test connection to the core
    const healthResult = await checkNodeHealth({
      ip: ip_address,
      port: portNum,
      protocol: proto,
      apiKey: api_key
    });

    if (!healthResult.success) {
      return NextResponse.json({ error: `Could not connect to Core: ${healthResult.error}` }, { status: 400 });
    }

    const status = 'online';

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO nodes (name, ip_address, port, protocol, api_key, status, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, ip_address, portNum, proto, api_key, status, new Date().toISOString()]
    );

    return NextResponse.json({
      id: result.lastID,
      name,
      ip_address,
      port: portNum,
      protocol: proto,
      status,
      connectionSuccessful: true
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding node:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
