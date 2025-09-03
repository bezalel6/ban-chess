-- Migration to add missing columns to Game table
-- This migration adds the bcn and moveTimes columns that are required for the application

-- Check if bcn column exists, if not add it
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

-- Check if moveTimes column exists, if not add it
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

-- Set default values for existing rows if any
UPDATE "Game" 
SET "bcn" = ARRAY[]::TEXT[] 
WHERE "bcn" IS NULL;

UPDATE "Game" 
SET "moveTimes" = ARRAY[]::INTEGER[] 
WHERE "moveTimes" IS NULL;