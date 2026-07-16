import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { coreClient } from '@/lib/coreClient';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { repository, branch } = body;

    if (!repository || !branch) {
      return NextResponse.json({ error: 'Repository and branch are required' }, { status: 400 });
    }

    // Generate a unique deployment ID
    const id = `deploy-${Math.random().toString(36).substring(2, 9)}`;

    // Forward the deployment request to the Core via mTLS + JWT
    const coreResponse = await coreClient.post('/deployments', {
      id,
      repository,
      branch
    });

    return NextResponse.json({ success: true, id, coreResponse }, { status: 201 });
  } catch (error: any) {
    console.error('Deployment API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
