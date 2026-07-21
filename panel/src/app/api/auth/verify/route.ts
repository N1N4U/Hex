import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/../database';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Ensure JWT_SECRET is loaded from the database
    await getDb();
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_change_in_production');
    await jwtVerify(token, secret);

    return NextResponse.json({ valid: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
