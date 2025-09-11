# Time Control Migration to Milliseconds

## Overview
This document describes the migration of time control values from seconds to milliseconds throughout the application for consistency and precision.

## Rationale
- **Consistency**: PlayerClock already uses milliseconds, but TimeControl used seconds
- **Precision**: Milliseconds provide better granularity for timer accuracy
- **Standard**: Most JavaScript timing APIs use milliseconds natively

## Changes Made

### 1. TypeScript Types (`lib/game-types.ts`)
```typescript
// Before
export interface TimeControl {
  initial: number; // Initial time in seconds
  increment: number; // Fischer increment in seconds
}

// After
export interface TimeControl {
  initial: number; // Initial time in milliseconds
  increment: number; // Fischer increment in milliseconds
}
```

### 2. Database Storage
- Field: `timeControl` (String) in Game table
- Old format: `"300+5"` (300 seconds + 5 second increment)
- New format: `'{"initial":300000,"increment":5000}'` (JSON with milliseconds)

### 3. Redis Storage
- Already stores raw numbers, just updated to be milliseconds
- Keys: `timeControlInitial` and `timeControlIncrement` in game hash

## Migration Process

### Step 1: Backup Database
```bash
# Create a backup before migration
pg_dump your_database > backup_before_time_migration.sql
```

### Step 2: Run Migration Script
```bash
# Run the migration script
npm run db:migrate-time

# The script will:
# 1. Parse existing time control formats
# 2. Convert seconds to milliseconds
# 3. Update database records
# 4. Migrate moveTimes array to milliseconds
```

### Step 3: Verify Migration
The migration script will output:
- Total games processed
- Successfully migrated count
- Skipped count (already migrated)
- Failed count (if any)

## Supported Input Formats
The migration script handles various formats:
1. **Simple format**: `"300+5"` → 300 seconds + 5 second increment
2. **JSON format**: `'{"initial":300,"increment":5}'` → Already structured
3. **With units**: `"5m+5s"` → 5 minutes + 5 seconds
4. **Already migrated**: Values > 1000 are assumed to be milliseconds

## Code Updates Required

### Frontend Components
Components that display or process time should handle milliseconds:

```typescript
// Converting milliseconds to display format
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
```

### Game Creation
When creating games with time control:

```typescript
// Old (seconds)
const timeControl = {
  initial: 300,    // 5 minutes
  increment: 5     // 5 seconds
};

// New (milliseconds)
const timeControl = {
  initial: 300000,  // 5 minutes
  increment: 5000   // 5 seconds
};
```

### Timer Service
The timer service (`server/services/timer-service.ts`) should already handle milliseconds for `PlayerClock.remaining`.

## Rollback Plan
If issues occur:
1. Restore database from backup
2. Revert code changes
3. Restart services

## Testing Checklist
- [ ] Create new game with time control
- [ ] Load existing games with migrated time
- [ ] Timer countdown works correctly
- [ ] Time increment applies properly
- [ ] Game ends correctly on timeout
- [ ] Time display shows correct values

## Notes
- The migration is idempotent - running it multiple times is safe
- Games without time control are skipped
- Already migrated values (>1000) are detected and skipped
- Both `timeControl` string and `moveTimes` array are migrated