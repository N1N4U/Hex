import { NextResponse } from 'next/server';
import { getDb } from '@/../database';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const db = await getDb();
    
    await db.run('DELETE FROM nodes WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
