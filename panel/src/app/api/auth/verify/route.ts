import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.RUNTIME_SECRET || 'fallback_secret_change_in_production');
    await jwtVerify(token, secret);

    return NextResponse.json({ valid: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
