# Database Migration Fix for Production

## Problem
The production database is missing the `bcn` and `moveTimes` columns in the `Game` table, causing the error:
```
The column `Game.bcn` does not exist in the current database.
```

## Solution

### Option 1: Using Prisma Migrate (Recommended)
Run these commands on your production server:

```bash
# Set your production DATABASE_URL
export DATABASE_URL="your_production_database_url"

# Generate Prisma client
npx prisma generate

# Deploy migrations (this will create the schema from scratch if needed)
npx prisma db push
```

### Option 2: Manual SQL Migration
If Option 1 doesn't work, run this SQL directly on your production database:

```sql
-- Add bcn column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 
                   FROM information_schema.columns 
                   WHERE table_name='Game' 
                   AND column_name='bcn') 
    THEN
        ALTER TABLE "Game" ADD COLUMN "bcn" TEXT[];
    END IF;
END $$;

-- Add moveTimes column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 
                   FROM information_schema.columns 
                   WHERE table_name='Game' 
                   AND column_name='moveTimes') 
    THEN
        ALTER TABLE "Game" ADD COLUMN "moveTimes" INTEGER[];
    END IF;
END $$;

-- Set default values for existing rows
UPDATE "Game" 
SET "bcn" = ARRAY[]::TEXT[] 
WHERE "bcn" IS NULL;

UPDATE "Game" 
SET "moveTimes" = ARRAY[]::INTEGER[] 
WHERE "moveTimes" IS NULL;
```

### Option 3: Complete Schema Reset (Last Resort)
If you don't have any important data in production yet:

```bash
# WARNING: This will DELETE ALL DATA
npx prisma db push --force-reset
```

## Verification
After running the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Game' 
AND column_name IN ('bcn', 'moveTimes');
```

You should see:
- `bcn` with type `ARRAY` or `text[]`
- `moveTimes` with type `ARRAY` or `integer[]`

## Restart the Application
After the database migration is complete:

```bash
# Restart your application
pm2 restart all
# or
systemctl restart your-app
```

## Prevention
For future deployments, always run:
```bash
npx prisma db push
```
before starting the application to ensure the database schema matches your Prisma schema.