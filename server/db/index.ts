import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

// Create a connection pool for better performance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Add SSL configuration for production environments
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Validate database URL is present
if (!process.env.DATABASE_URL) {
  console.error('[PostgreSQL] ❌ DATABASE_URL environment variable is not set');
  console.error('[PostgreSQL] Please set DATABASE_URL in your .env.local file');
  console.error('[PostgreSQL] Example: DATABASE_URL=postgresql://username:password@localhost:5432/chess2ban');
}

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Test connection
pool.on('connect', () => {
  console.log('[PostgreSQL] ✅ Connected to database');
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] ❌ Database error:', err);
});

// Graceful shutdown
export async function closeDatabase() {
  await pool.end();
  console.log('[PostgreSQL] Database connections closed');
}

// Export schema for use in other files
export * from './schema';