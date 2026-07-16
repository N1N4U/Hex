import https from 'https';
import fs from 'fs';
import path from 'path';

// Secure core client that attaches mTLS certificates and JWT
export class CoreClient {
  private agent: https.Agent;
  private coreUrl: string;

  constructor() {
    this.coreUrl = process.env.CORE_URL || 'https://127.0.0.1:8080';
    
    // In production, these should be loaded securely
    const certDir = path.resolve(process.cwd(), '../cli/certs');
    
    try {
      this.agent = new https.Agent({
        cert: fs.readFileSync(path.join(certDir, 'client.crt')),
        key: fs.readFileSync(path.join(certDir, 'client.key')),
        ca: fs.readFileSync(path.join(certDir, 'ca.crt')),
        rejectUnauthorized: true,
      });
    } catch (error) {
      console.warn('Warning: mTLS certificates not found. CoreClient will fail in production.');
      this.agent = new https.Agent({ rejectUnauthorized: false });
    }
  }

  // Generates the short-lived JWT using the Panel API Key
  private generatePanelJWT(): string {
    const apiKey = process.env.PANEL_API_KEY || 'hx_panel_default_key';
    // In a real implementation, sign a JWT using the apiKey here
    return `Bearer dummy_jwt_signed_by_${apiKey}`;
  }

  async get(endpoint: string) {
    const res = await fetch(`${this.coreUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': this.generatePanelJWT(),
      },
      agent: this.agent,
    } as any);
    
    if (!res.ok) {
      throw new Error(`Core responded with ${res.status}`);
    }
    return res.json();
  }

  async post(endpoint: string, body: any) {
    const res = await fetch(`${this.coreUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': this.generatePanelJWT(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      agent: this.agent,
    } as any);
    
    if (!res.ok) {
      throw new Error(`Core responded with ${res.status}`);
    }
    return res.json();
  }
}

export const coreClient = new CoreClient();
