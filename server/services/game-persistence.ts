/**
 * Game Persistence Service
 * 
 * Handles saving completed games to the database
 */

import { PrismaClient } from '@prisma/client';
import { getActionHistory, getGameState, getMoveTimes } from '../redis';

const prisma = new PrismaClient();

/**
 * Save a completed game to the database
 */
export async function saveCompletedGame(gameId: string): Promise<void> {
  try {
    // Get game data from Redis
    const gameState = await getGameState(gameId);
    if (!gameState) {
      console.error(`[GamePersistence] Game ${gameId} not found in Redis`);
      return;
    }

    // Get action history (BCN format)
    const bcn = await getActionHistory(gameId);
    if (bcn.length === 0) {
      console.error(`[GamePersistence] No action history for game ${gameId}`);
      return;
    }

    // Get move times (in milliseconds)
    const moveTimes = await getMoveTimes(gameId);
    
    // Extract time control
    const timeControl = gameState.timeControl 
      ? `${gameState.timeControl.initial}+${gameState.timeControl.increment}`
      : "unlimited";

    // Determine result
    const result = gameState.result || "unknown";

    // Ensure we have both player IDs
    if (!gameState.whitePlayerId || !gameState.blackPlayerId) {
      console.error(`[GamePersistence] Missing player IDs for game ${gameId}`);
      return;
    }

    // Save to database WITH THE ORIGINAL GAME ID
    const savedGame = await prisma.game.create({
      data: {
        id: gameId, // USE THE ACTUAL GAME ID!!!
        whitePlayerId: gameState.whitePlayerId,
        blackPlayerId: gameState.blackPlayerId,
        bcn,
        moveTimes, // Keep in milliseconds
        result,
        timeControl,
      },
    });

    console.log(`[GamePersistence] Saved game ${gameId} to database with ID ${savedGame.id}`);
    console.log(`[GamePersistence] BCN entries: ${bcn.length}, Move times: ${moveTimes.length}`);
    
    // Optional: Clean up Redis after successful save
    // You might want to keep the data for a while for analysis
    // await cleanupRedisGame(gameId);
    
  } catch (error) {
    console.error(`[GamePersistence] Error saving game ${gameId}:`, error);
    throw error;
  }
}

/**
 * Clean up Redis data after game is saved
 * (Optional - you might want to keep it for a while)
 */
export async function cleanupRedisGame(gameId: string): Promise<void> {
  // Import redis here to avoid circular dependency
  const { redis, KEYS } = await import('../redis');
  
  const keys = [
    KEYS.GAME(gameId),
    KEYS.GAME_STATE(gameId),
    KEYS.GAME_ACTIONS(gameId),
    KEYS.GAME_HISTORY(gameId),
    KEYS.GAME_PLAYERS(gameId),
    KEYS.GAME_MOVE_TIMES(gameId),
    `timer:${gameId}`,
  ];
  
  for (const key of keys) {
    await redis.del(key);
  }
  
  console.log(`[GamePersistence] Cleaned up Redis data for game ${gameId}`);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});

export { prisma };