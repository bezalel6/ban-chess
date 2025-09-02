import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ count: 0, error: 'Database connection failed' }, { status: 500 });
  }
}