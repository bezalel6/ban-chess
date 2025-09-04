-- Fix game results to use standardized chess notation
-- This migration converts old descriptive results to standard format (1-0, 0-1, 1/2-1/2)

-- Create a temporary function to standardize results
CREATE OR REPLACE FUNCTION standardize_game_result(old_result TEXT, old_reason TEXT)
RETURNS TABLE(new_result TEXT, new_reason TEXT) AS $$
DECLARE
    result_lower TEXT := LOWER(old_result);
BEGIN
    -- Check for White wins
    IF result_lower LIKE '%white win%' THEN
        new_result := '1-0';
        IF result_lower LIKE '%time%' OR result_lower LIKE '%timeout%' THEN
            new_reason := 'timeout';
        ELSIF result_lower LIKE '%checkmate%' THEN
            new_reason := 'checkmate';
        ELSIF result_lower LIKE '%resign%' THEN
            new_reason := 'resignation';
        ELSE
            new_reason := COALESCE(old_reason, 'unknown');
        END IF;
        RETURN NEXT;
    -- Check for Black wins
    ELSIF result_lower LIKE '%black win%' THEN
        new_result := '0-1';
        IF result_lower LIKE '%time%' OR result_lower LIKE '%timeout%' THEN
            new_reason := 'timeout';
        ELSIF result_lower LIKE '%checkmate%' THEN
            new_reason := 'checkmate';
        ELSIF result_lower LIKE '%resign%' THEN
            new_reason := 'resignation';
        ELSE
            new_reason := COALESCE(old_reason, 'unknown');
        END IF;
        RETURN NEXT;
    -- Check for draws
    ELSIF result_lower LIKE '%stalemate%' THEN
        new_result := '1/2-1/2';
        new_reason := 'stalemate';
        RETURN NEXT;
    ELSIF result_lower LIKE '%draw%' THEN
        new_result := '1/2-1/2';
        new_reason := 'draw';
        RETURN NEXT;
    -- Already in standard format
    ELSIF old_result IN ('1-0', '0-1', '1/2-1/2') THEN
        new_result := old_result;
        new_reason := COALESCE(old_reason, 'unknown');
        RETURN NEXT;
    ELSE
        -- Unknown format, don't change
        new_result := old_result;
        new_reason := COALESCE(old_reason, 'unknown');
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update all games with non-standard results
UPDATE "Game" g
SET 
    result = s.new_result,
    "resultReason" = s.new_reason
FROM (
    SELECT 
        id,
        (standardize_game_result(result, "resultReason")).*
    FROM "Game"
    WHERE result NOT IN ('1-0', '0-1', '1/2-1/2')
) s
WHERE g.id = s.id;

-- Drop the temporary function
DROP FUNCTION IF EXISTS standardize_game_result(TEXT, TEXT);

-- Add a check constraint to ensure only valid results going forward (optional)
-- This will prevent invalid results from being inserted in the future
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_game_result'
    ) THEN
        ALTER TABLE "Game" 
        ADD CONSTRAINT valid_game_result 
        CHECK (result IN ('1-0', '0-1', '1/2-1/2'));
    END IF;
END $$;