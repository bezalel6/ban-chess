import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import prisma from './prisma';
import { NextResponse } from 'next/server';

export async function isAdmin() {
  const session = await getServerSession(authOptions);
  
  // The session has userId, not id
  const userId = (session?.user as { userId?: string })?.userId;
  
  if (!userId) {
    console.log('[Admin Check] No userId found in session');
    return false;
  }
  
  console.log('[Admin Check] Checking admin status for userId:', userId);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, email: true }
  });
  
  console.log('[Admin Check] User found:', user);
  
  return user?.isAdmin === true;
}

export async function requireAdmin() {
  const admin = await isAdmin();
  
  console.log('[requireAdmin] isAdmin result:', admin);
  
  if (!admin) {
    console.log('[requireAdmin] Returning 403 - not admin');
    return NextResponse.json(
      { error: 'Unauthorized. Admin access required.' },
      { status: 403 }
    );
  }
  
  console.log('[requireAdmin] Admin verified - returning null to continue');
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