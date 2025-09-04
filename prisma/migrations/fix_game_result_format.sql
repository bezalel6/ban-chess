-- Fix game results to use standardized chess notation
-- This migration converts old descriptive results to standard format

-- Update "White wins on time!" to "1-0" with reason "timeout"
UPDATE "Game" 
SET result = '1-0', 
    "resultReason" = COALESCE("resultReason", 'timeout')
WHERE result = 'White wins on time!';

-- Update "Black wins on time!" to "0-1" with reason "timeout"
UPDATE "Game" 
SET result = '0-1', 
    "resultReason" = COALESCE("resultReason", 'timeout')
WHERE result = 'Black wins on time!';

-- Update "White wins by checkmate!" to "1-0" with reason "checkmate"
UPDATE "Game" 
SET result = '1-0', 
    "resultReason" = COALESCE("resultReason", 'checkmate')
WHERE result = 'White wins by checkmate!';

-- Update "Black wins by checkmate!" to "0-1" with reason "checkmate"
UPDATE "Game" 
SET result = '0-1', 
    "resultReason" = COALESCE("resultReason", 'checkmate')
WHERE result = 'Black wins by checkmate!';

-- Update "White wins by resignation" to "1-0" with reason "resignation"
UPDATE "Game" 
SET result = '1-0', 
    "resultReason" = COALESCE("resultReason", 'resignation')
WHERE result LIKE '%White wins%resignation%';

-- Update "Black wins by resignation" to "0-1" with reason "resignation"
UPDATE "Game" 
SET result = '0-1', 
    "resultReason" = COALESCE("resultReason", 'resignation')
WHERE result LIKE '%Black wins%resignation%';

-- Update stalemate results to "1/2-1/2" with reason "stalemate"
UPDATE "Game" 
SET result = '1/2-1/2', 
    "resultReason" = COALESCE("resultReason", 'stalemate')
WHERE result LIKE '%stalemate%' OR result LIKE '%Stalemate%';

-- Update draw results to "1/2-1/2" with reason "draw"
UPDATE "Game" 
SET result = '1/2-1/2', 
    "resultReason" = COALESCE("resultReason", 'draw')
WHERE (result LIKE '%draw%' OR result LIKE '%Draw%') 
  AND result NOT IN ('1-0', '0-1', '1/2-1/2');

-- Generic updates for any remaining non-standard results
UPDATE "Game" 
SET result = '1-0', 
    "resultReason" = COALESCE("resultReason", 'unknown')
WHERE (result LIKE '%White wins%' OR result LIKE '%white wins%')
  AND result NOT IN ('1-0', '0-1', '1/2-1/2');

UPDATE "Game" 
SET result = '0-1', 
    "resultReason" = COALESCE("resultReason", 'unknown')
WHERE (result LIKE '%Black wins%' OR result LIKE '%black wins%')
  AND result NOT IN ('1-0', '0-1', '1/2-1/2');

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Game result format migration completed. All games should now use standardized notation (1-0, 0-1, 1/2-1/2).';
END $$;