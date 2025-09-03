import prisma from './prisma';

/**
 * Ensures database schema is up to date and performs necessary migrations
 * Called during server startup for safe deployment
 */
export async function ensureDbSchema() {
  console.log('[DB Migration] Starting database schema check...');
  
  try {
    // Check if GlobalSettings table exists and has required fields
    await ensureGlobalSettings();
    
    // Check if User table has isAdmin field
    await ensureUserAdminField();
    
    // Check other critical tables
    await ensureRequiredTables();
    
    console.log('[DB Migration] Database schema check complete ✓');
  } catch (error) {
    console.error('[DB Migration] Error during schema check:', error);
    // Log but don't throw - we'll try to continue
  }
}

async function ensureGlobalSettings() {
  try {
    // Try to find or create the global settings record
    let settings = await prisma.globalSettings.findUnique({
      where: { id: 'global' }
    });

    if (!settings) {
      console.log('[DB Migration] Creating default GlobalSettings record...');
      settings = await prisma.globalSettings.create({
        data: {
          id: 'global',
          soundEnabled: true,
          soundVolume: 0.5,
          eventSoundMap: {}
        }
      });
      console.log('[DB Migration] GlobalSettings created ✓');
    } else {
      console.log('[DB Migration] GlobalSettings exists ✓');
    }
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'P2002') {
      console.log('[DB Migration] GlobalSettings already exists ✓');
    } else if (err.code === 'P2025' || err.message?.includes('table') || err.message?.includes('relation')) {
      console.error('[DB Migration] GlobalSettings table may not exist. Run: npx prisma db push');
      throw new Error('Database schema out of sync - GlobalSettings table missing');
    } else {
      console.error('[DB Migration] Error checking GlobalSettings:', error);
    }
  }
}

async function ensureUserAdminField() {
  try {
    // Try to query a user with isAdmin field
    await prisma.user.findFirst({
      select: { isAdmin: true },
      take: 1
    });
    
    console.log('[DB Migration] User.isAdmin field exists ✓');
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err.message?.includes('isAdmin') || err.code === 'P2022') {
      console.error('[DB Migration] User.isAdmin field missing. Run: npx prisma db push');
      throw new Error('Database schema out of sync - User.isAdmin field missing');
    }
    // If no users exist, that's fine
    console.log('[DB Migration] User table check complete ✓');
  }
}

async function ensureRequiredTables() {
  const requiredTables = [
    { name: 'User', check: () => prisma.user.count() },
    { name: 'Game', check: () => prisma.game.count() },
    { name: 'PlayerPresence', check: () => prisma.playerPresence.count() },
    { name: 'Session', check: () => prisma.session.count() },
    { name: 'Account', check: () => prisma.account.count() }
  ];

  for (const table of requiredTables) {
    try {
      await table.check();
      console.log(`[DB Migration] Table ${table.name} exists ✓`);
    } catch (error) {
      const err = error as { message?: string };
      if (err.message?.includes('table') || err.message?.includes('relation')) {
        console.error(`[DB Migration] Table ${table.name} missing. Run: npx prisma db push`);
        throw new Error(`Database schema out of sync - ${table.name} table missing`);
      }
      // Other errors (like empty tables) are fine
    }
  }
}

/**
 * Run any pending data migrations
 */
export async function runDataMigrations() {
  console.log('[DB Migration] Checking for data migrations...');
  
  try {
    // Check all GlobalSettings and fix any with null/undefined eventSoundMap
    const allSettings = await prisma.globalSettings.findMany();
    
    for (const setting of allSettings) {
      // Check if eventSoundMap is null or undefined (JSON fields can be tricky)
      if (!setting.eventSoundMap || setting.eventSoundMap === null) {
        console.log(`[DB Migration] Fixing GlobalSettings ${setting.id} with null eventSoundMap...`);
        await prisma.globalSettings.update({
          where: { id: setting.id },
          data: { eventSoundMap: {} }
        });
        console.log('[DB Migration] Fixed null eventSoundMap value ✓');
      }
    }

    console.log('[DB Migration] Data migrations complete ✓');
  } catch (error) {
    console.error('[DB Migration] Error during data migrations:', error);
    // Continue anyway - data migrations are not critical
  }
}