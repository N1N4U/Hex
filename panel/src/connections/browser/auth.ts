import * as jwt from 'jose';
import { getDb } from '../../../database';

export async function authenticateBrowserClient(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    // Ensure JWT_SECRET is loaded from the database (persists across restarts)
    await getDb();
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_change_in_production');
    await jwt.jwtVerify(token, secret);
    return true;
  } catch (e) {
    return false;
  }
}
