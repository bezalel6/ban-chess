import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

// Create a connection pool for better performance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/chess2ban',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

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