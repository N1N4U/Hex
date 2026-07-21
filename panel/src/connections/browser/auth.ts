import * as jwt from 'jose';

export async function authenticateBrowserClient(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    // RUNTIME_SECRET is generated in server.ts on every restart
    const secret = new TextEncoder().encode(process.env.RUNTIME_SECRET || 'fallback_secret_change_in_production');
    await jwt.jwtVerify(token, secret);
    return true;
  } catch (e) {
    return false;
  }
}
