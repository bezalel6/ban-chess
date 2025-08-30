import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/chess2ban',
  },
  verbose: true,
  strict: true,
} satisfies Config;