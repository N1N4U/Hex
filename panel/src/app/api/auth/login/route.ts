import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getDb } from '@/../database';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUsername = process.env.OWNER_USERNAME || 'admin';
    const expectedPassword = process.env.OWNER_PASSWORD || 'admin';

    if (username === expectedUsername && password === expectedPassword) {
      // Ensure JWT_SECRET is loaded from the database
      await getDb();
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_change_in_production');
      
      const token = await new SignJWT({ user: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret);

      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
