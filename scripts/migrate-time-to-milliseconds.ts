#!/usr/bin/env tsx
/**
 * Migration script to convert time control from seconds to milliseconds
 * This script will:
 * 1. Parse existing timeControl strings (format: "initial+increment")
 * 2. Convert seconds to milliseconds
 * 3. Update the database records
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ParsedTimeControl {
  initial: number; // in milliseconds
  increment: number; // in milliseconds
}

/**
 * Parse time control string format "initial+increment" (in seconds)
 * and convert to milliseconds
 */
function parseTimeControl(timeControlStr: string): ParsedTimeControl | null {
  if (!timeControlStr) return null;
  
  // Handle various possible formats
  // Format 1: "300+5" (300 seconds + 5 second increment)
  // Format 2: "5m+5s" or "5min+5sec" (with units)
  // Format 3: JSON string '{"initial":300,"increment":5}'
  
  try {
    // Try parsing as JSON first
    if (timeControlStr.startsWith('{')) {
      const parsed = JSON.parse(timeControlStr);
      // Check if already in milliseconds (values > 1000 likely already converted)
      if (parsed.initial > 1000) {
        return {
          initial: parsed.initial,
          increment: parsed.increment
        };
      }
      // Convert from seconds to milliseconds
      return {
        initial: parsed.initial * 1000,
        increment: parsed.increment * 1000
      };
    }
    
    // Parse "initial+increment" format
    const match = timeControlStr.match(/^(\d+)(?:\s*\+\s*(\d+))?$/);
    if (match) {
      const initial = parseInt(match[1], 10);
      const increment = parseInt(match[2] || '0', 10);
      
      // If values are very large (> 1000), assume already in milliseconds
      if (initial > 1000) {
        return { initial, increment };
      }
      
      // Convert seconds to milliseconds
      return {
        initial: initial * 1000,
        increment: increment * 1000
      };
    }
    
    // Parse with time units (e.g., "5m+5s")
    const timeMatch = timeControlStr.match(/^(\d+)([msh]?)(?:\s*\+\s*(\d+)([msh]?))?$/i);
    if (timeMatch) {
      const initialValue = parseInt(timeMatch[1], 10);
      const initialUnit = timeMatch[2] || 's';
      const incrementValue = parseInt(timeMatch[3] || '0', 10);
      const incrementUnit = timeMatch[4] || 's';
      
      const unitToMs: Record<string, number> = {
        'h': 3600000, // hours to ms
        'm': 60000,   // minutes to ms
        's': 1000,    // seconds to ms
        '': 1000      // default to seconds
      };
      
      return {
        initial: initialValue * (unitToMs[initialUnit.toLowerCase()] || 1000),
        increment: incrementValue * (unitToMs[incrementUnit.toLowerCase()] || 1000)
      };
    }
    
    console.warn(`Unable to parse time control: ${timeControlStr}`);
    return null;
  } catch (error) {
    console.error(`Error parsing time control "${timeControlStr}":`, error);
    return null;
  }
}

/**
 * Convert parsed time control back to storage format (JSON string with milliseconds)
 */
function formatTimeControl(timeControl: ParsedTimeControl): string {
  return JSON.stringify({
    initial: timeControl.initial,
    increment: timeControl.increment
  });
}

async function migrateTimeControls() {
  console.log("Starting time control migration to milliseconds...");
  
  try {
    // Get all games with time control
    const games = await prisma.game.findMany({
      select: {
        id: true,
        timeControl: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${games.length} games to process`);
    
    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const game of games) {
      try {
        const parsed = parseTimeControl(game.timeControl);
        
        if (!parsed) {
          console.warn(`Skipping game ${game.id} - unable to parse time control`);
          skipped++;
          continue;
        }
        
        // Check if already in milliseconds format
        if (game.timeControl.includes('"initial":') && game.timeControl.includes('"increment":')) {
          const existing = JSON.parse(game.timeControl);
          if (existing.initial > 1000) {
            console.log(`Game ${game.id} already migrated`);
            skipped++;
            continue;
          }
        }
        
        const newTimeControl = formatTimeControl(parsed);
        
        // Update the game record
        await prisma.game.update({
          where: { id: game.id },
          data: { timeControl: newTimeControl }
        });
        
        console.log(`Migrated game ${game.id}: ${game.timeControl} -> ${newTimeControl}`);
        migrated++;
        
      } catch (error) {
        console.error(`Failed to migrate game ${game.id}:`, error);
        failed++;
      }
    }
    
    console.log("\n=== Migration Summary ===");
    console.log(`Total games: ${games.length}`);
    console.log(`Successfully migrated: ${migrated}`);
    console.log(`Skipped (already migrated or no time control): ${skipped}`);
    console.log(`Failed: ${failed}`);
    
    // Also migrate moveTimes if they exist
    console.log("\n=== Migrating moveTimes to milliseconds ===");
    const gamesWithMoveTimes = await prisma.game.findMany({
      where: {
        NOT: {
          moveTimes: {
            equals: []
          }
        }
      },
      select: {
        id: true,
        moveTimes: true
      }
    });
    
    console.log(`Found ${gamesWithMoveTimes.length} games with move times`);
    
    let moveTimesMigrated = 0;
    for (const game of gamesWithMoveTimes) {
      try {
        // Check if already in milliseconds (values > 1000 likely already converted)
        const maxTime = Math.max(...game.moveTimes);
        if (maxTime > 1000) {
          console.log(`Game ${game.id} move times already in milliseconds`);
          continue;
        }
        
        // Convert seconds to milliseconds
        const newMoveTimes = game.moveTimes.map(time => time * 1000);
        
        await prisma.game.update({
          where: { id: game.id },
          data: { moveTimes: newMoveTimes }
        });
        
        console.log(`Migrated move times for game ${game.id}`);
        moveTimesMigrated++;
      } catch (error) {
        console.error(`Failed to migrate move times for game ${game.id}:`, error);
      }
    }
    
    console.log(`\nMigrated move times for ${moveTimesMigrated} games`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateTimeControls()
  .then(() => {
    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });