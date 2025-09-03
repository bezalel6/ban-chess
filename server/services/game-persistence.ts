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
  console.log(`\n[GamePersistence] ========== SAVING GAME ${gameId} ==========`);
  
  try {
    // Get game data from Redis
    console.log(`[GamePersistence] Step 1: Fetching game state from Redis...`);
    const gameState = await getGameState(gameId);
    if (!gameState) {
      console.error(`[GamePersistence] ❌ Game ${gameId} not found in Redis`);
      return;
    }
    console.log(`[GamePersistence] ✅ Game state retrieved:`, {
      whitePlayerId: gameState.whitePlayerId,
      blackPlayerId: gameState.blackPlayerId,
      result: gameState.result,
      gameOver: gameState.gameOver
    });

    // Get action history (BCN format)
    console.log(`[GamePersistence] Step 2: Fetching action history...`);
    const bcn = await getActionHistory(gameId);
    if (bcn.length === 0) {
      console.error(`[GamePersistence] ❌ No action history for game ${gameId}`);
      return;
    }
    console.log(`[GamePersistence] ✅ BCN history retrieved: ${bcn.length} actions`);

    // Get move times (in milliseconds)
    console.log(`[GamePersistence] Step 3: Fetching move times...`);
    const moveTimes = await getMoveTimes(gameId);
    console.log(`[GamePersistence] ✅ Move times retrieved: ${moveTimes.length} entries`);
    
    // Extract time control
    const timeControl = gameState.timeControl 
      ? `${gameState.timeControl.initial}+${gameState.timeControl.increment}`
      : "unlimited";

    // Determine result
    const result = gameState.result || "unknown";

    // Ensure we have both player IDs
    if (!gameState.whitePlayerId || !gameState.blackPlayerId) {
      console.error(`[GamePersistence] ❌ Missing player IDs for game ${gameId}`);
      console.error(`[GamePersistence]    White: ${gameState.whitePlayerId}`);
      console.error(`[GamePersistence]    Black: ${gameState.blackPlayerId}`);
      return;
    }

    // CRITICAL: Ensure users exist in database before saving game
    console.log(`[GamePersistence] Step 4: Ensuring users exist in database...`);
    console.log(`[GamePersistence]    White player ID: ${gameState.whitePlayerId}`);
    console.log(`[GamePersistence]    Black player ID: ${gameState.blackPlayerId}`);
    
    const { redis, KEYS } = await import('../redis');
    
    // Get usernames from Redis sessions or use defaults
    let whiteUsername = `user_${gameState.whitePlayerId.slice(0, 8)}`;
    let blackUsername = `user_${gameState.blackPlayerId.slice(0, 8)}`;
    
    const whiteSession = await redis.get(KEYS.PLAYER_SESSION(gameState.whitePlayerId));
    if (whiteSession) {
      const session = JSON.parse(whiteSession);
      whiteUsername = session.username || whiteUsername;
      console.log(`[GamePersistence]    Found white player session: ${whiteUsername}`);
    } else {
      console.log(`[GamePersistence]    No session for white player, using default: ${whiteUsername}`);
    }
    
    const blackSession = await redis.get(KEYS.PLAYER_SESSION(gameState.blackPlayerId));
    if (blackSession) {
      const session = JSON.parse(blackSession);
      blackUsername = session.username || blackUsername;
      console.log(`[GamePersistence]    Found black player session: ${blackUsername}`);
    } else {
      console.log(`[GamePersistence]    No session for black player, using default: ${blackUsername}`);
    }
    
    // Create or update users in database
    console.log(`[GamePersistence] Step 5: Creating/updating users in database...`);
    
    try {
      await prisma.user.upsert({
        where: { id: gameState.whitePlayerId },
        update: { username: whiteUsername },
        create: {
          id: gameState.whitePlayerId,
          username: whiteUsername,
          isGuest: true
        }
      });
      console.log(`[GamePersistence]    ✅ White player upserted: ${whiteUsername}`);
    } catch (userError) {
      console.error(`[GamePersistence]    ❌ Error upserting white player:`, userError);
      throw userError;
    }
    
    if (gameState.blackPlayerId !== gameState.whitePlayerId) {
      try {
        await prisma.user.upsert({
          where: { id: gameState.blackPlayerId },
          update: { username: blackUsername },
          create: {
            id: gameState.blackPlayerId,
            username: blackUsername,
            isGuest: true
          }
        });
        console.log(`[GamePersistence]    ✅ Black player upserted: ${blackUsername}`);
      } catch (userError) {
        console.error(`[GamePersistence]    ❌ Error upserting black player:`, userError);
        throw userError;
      }
    } else {
      console.log(`[GamePersistence]    ℹ️ Same player for both sides, skipping black player upsert`);
    }

    // Reconstruct the game to get the final position with ban state
    const { BanChess } = await import('ban-chess.ts');
    const finalGame = BanChess.replayFromActions(bcn);
    const finalPosition = finalGame.fen(); // This includes the ban state in the 7th field
    const moveCount = bcn.filter(action => action.startsWith('m:')).length;
    
    // Extract result reason from the result string
    let resultReason = 'unknown';
    if (result.includes('checkmate')) resultReason = 'checkmate';
    else if (result.includes('resignation')) resultReason = 'resignation';
    else if (result.includes('timeout')) resultReason = 'timeout';
    else if (result.includes('stalemate')) resultReason = 'stalemate';
    else if (result.includes('draw')) resultReason = 'draw';

    // Save to database WITH THE ORIGINAL GAME ID
    console.log(`[GamePersistence] Step 6: Saving game to database...`);
    console.log(`[GamePersistence]    Game ID: ${gameId}`);
    console.log(`[GamePersistence]    Result: ${result}`);
    console.log(`[GamePersistence]    Time control: ${timeControl}`);
    console.log(`[GamePersistence]    Move count: ${moveCount}`);
    
    const savedGame = await prisma.game.create({
      data: {
        id: gameId, // USE THE ACTUAL GAME ID!!!
        whitePlayerId: gameState.whitePlayerId,
        blackPlayerId: gameState.blackPlayerId,
        bcn,
        moveTimes: moveTimes.map(t => Math.round(t)), // Ensure integers (milliseconds)
        finalPosition,
        result,
        resultReason,
        timeControl,
        moveCount,
      },
    });

    console.log(`[GamePersistence] ✅ SUCCESS! Game ${gameId} saved to database`);
    console.log(`[GamePersistence]    Database ID: ${savedGame.id}`);
    console.log(`[GamePersistence]    BCN entries: ${bcn.length}`);
    console.log(`[GamePersistence]    Move times: ${moveTimes.length}`);
    console.log(`[GamePersistence] ========== SAVE COMPLETE ==========\n`);
    
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