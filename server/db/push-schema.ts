#!/usr/bin/env tsx
/**
 * Push Schema Script
 * Drops all existing tables and creates fresh ones with the new unified schema
 * WARNING: This will DELETE ALL DATA!
 *
 * Usage: npx tsx server/db/push-schema.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

// Get database URL from environment
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/chess2ban';

async function pushSchema() {
  console.log('🔄 Database Schema Reset - Starting...');
  console.log('⚠️  WARNING: This will DELETE ALL DATA!');
  console.log('📍 Database:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

  // Create connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
  });
  const db = drizzle(pool, { schema });

  try {
    console.log('\n📋 Step 1: Dropping existing tables...');

    // Drop all tables in reverse dependency order
    const dropTables = [
      'connections',
      'ban_history',
      'matchmaking_queue',
      'player_presence',
      'game_cache',
      'game_events',
      'moves',
      'move_buffer',
      'games',
      'oauth_accounts',
      'sessions',
      'admin_actions',
      'system_settings',
      'users',
    ];

    for (const table of dropTables) {
      try {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`));
        console.log(`   ✅ Dropped table: ${table}`);
      } catch {
        console.log(`   ⏭️  Table ${table} doesn't exist, skipping...`);
      }
    }

    // Drop functions
    console.log('\n📋 Step 2: Dropping existing functions...');
    await db.execute(
      sql.raw(`DROP FUNCTION IF EXISTS update_updated_at() CASCADE`)
    );
    await db.execute(
      sql.raw(`DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE`)
    );
    await db.execute(
      sql.raw(`DROP FUNCTION IF EXISTS update_player_heartbeat(uuid) CASCADE`)
    );
    console.log('   ✅ Functions dropped');

    console.log('\n📋 Step 3: Creating new schema...');

    // Run the migration SQL file
    const migrationSQL = await import('fs').then(fs =>
      fs.promises.readFile(
        './server/db/migrations/0001_unified_auth_redis.sql',
        'utf-8'
      )
    );

    // Split by statement breakpoint and execute each
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .filter(s => s.trim());

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await db.execute(sql.raw(statement));
          process.stdout.write('.');
        } catch (error) {
          console.error(
            `\n❌ Error executing statement ${i + 1}:`,
            error instanceof Error ? error.message : String(error)
          );
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('\n   ✅ Schema created successfully!');

    console.log('\n📋 Step 4: Inserting default data...');

    // Insert default system settings
    await db.execute(sql`
      INSERT INTO system_settings (key, value, description)
      VALUES 
        ('maintenance_mode', '{"enabled": false}', 'System maintenance mode toggle'),
        ('matchmaking_config', '{"minPlayers": 2, "maxWaitTime": 300}', 'Matchmaking configuration'),
        ('rating_config', '{"kFactor": 32, "initialRating": 1500}', 'ELO rating system configuration')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('   ✅ Default settings inserted');

    console.log('\n🎉 Database schema reset complete!');
    console.log('📊 Database is now ready with the new unified schema.');
  } catch (error) {
    console.error('\n❌ Error during schema push:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  pushSchema().catch(console.error);
}

export { pushSchema };
