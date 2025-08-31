#!/usr/bin/env node

/**
 * Production migration script
 * Runs database migrations when the app starts in production
 */

const { execSync } = require('child_process');

console.log('[Migration] Checking if database migrations are needed...');

try {
  // Check if tables exist by trying a simple query
  execSync('npx drizzle-kit push --config=drizzle.config.ts', {
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log('[Migration] ✅ Database migrations completed successfully');
} catch (error) {
  console.error('[Migration] ⚠️ Migration failed, but continuing app startup');
  console.error('[Migration] Error:', error.message);
  // Don't exit - let the app start anyway
}
