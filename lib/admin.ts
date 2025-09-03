import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import prisma from './prisma';
import { NextResponse } from 'next/server';

export async function isAdmin() {
  const session = await getServerSession(authOptions);
  
  // The session has userId, not id
  const userId = (session?.user as { userId?: string })?.userId;
  
  if (!userId) {
    return false;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });
  
  return user?.isAdmin === true;
}

export async function requireAdmin() {
  const admin = await isAdmin();
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin access required.' },
      { status: 403 }
    );
  }
  
  return null; // Continue if admin
}

export async function getGlobalSettings() {
  let settings = await prisma.globalSettings.findUnique({
    where: { id: 'global' }
  });
  
  // Create default settings if they don't exist
  if (!settings) {
    settings = await prisma.globalSettings.create({
      data: { id: 'global' }
    });
  }
  
  return settings;
}