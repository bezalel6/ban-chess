import { NextResponse } from 'next/server';
import { getSession, activeUsers } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    
    if (session.userId) {
      // Remove from active users
      activeUsers.delete(session.userId);
    }
    
    // Clear session
    session.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}