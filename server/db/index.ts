import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { Env } from '../../lib/env';

// Get database configuration from Env
const dbConfig = Env.getDatabaseConfig();

// Create a connection pool for better performance
const pool = new Pool({
  connectionString: dbConfig.url,
  max: dbConfig.maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: dbConfig.connectionTimeout,
  // SSL configuration - disabled for Coolify's internal PostgreSQL
  // Coolify uses internal Docker networking without SSL
  // Re-enable SSL if using external database services
  ssl: false,
  // Add connection retry logic
  allowExitOnIdle: false,
});

// Validate database URL is present
if (!dbConfig.url) {
  console.error('[PostgreSQL] ❌ DATABASE_URL environment variable is not set');
  console.error('[PostgreSQL] Please set DATABASE_URL in your .env.local file');
  console.error(
    '[PostgreSQL] Example: DATABASE_URL=postgresql://username:password@localhost:5432/chess2ban'
  );
}

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Test connection
pool.on('connect', () => {
  console.log('[PostgreSQL] ✅ Connected to database');
});

pool.on('error', err => {
  console.error('[PostgreSQL] ❌ Database error:', err);
});

// Database health check function
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[PostgreSQL] ✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('[PostgreSQL] ❌ Database connection test failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabase() {
  await pool.end();
  console.log('[PostgreSQL] Database connections closed');
}

// Run initial connection test
if (dbConfig.url) {
  testDatabaseConnection().catch(error => {
    console.error('[PostgreSQL] Initial connection test failed:', error);
  });
}

// Export schema for use in other files
export * from './schema';
