import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/../database'; // Up one level from src/app/api/auth/register since database.js is in panel root

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const db = await getDb();

    // Check if user already exists
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    
    // Default first user to Owner role, otherwise Viewer
    const countRes = await db.get('SELECT COUNT(*) as count FROM users');
    const role = countRes.count === 0 ? 'Owner' : 'Viewer';

    const result = await db.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, hash, role]
    );

    return NextResponse.json({ success: true, userId: result.lastID, role }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
