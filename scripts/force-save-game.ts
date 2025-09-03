/**
 * Force save a specific game from Redis to database
 */

import { redis, getGameState, getActionHistory, getMoveTimes } from '../server/redis';
import { saveCompletedGame } from '../server/services/game-persistence';

async function forceSaveGame(gameId: string) {
  console.log(`🔍 Attempting to save game ${gameId}...`);
  
  try {
    // Get game state
    const gameState = await getGameState(gameId);
    
    if (!gameState) {
      console.log(`❌ Game ${gameId} not found in Redis`);
      
      // Try to check if it exists directly
      const stateKey = `game:${gameId}:state`;
      const exists = await redis.exists(stateKey);
      console.log(`   Redis key exists: ${exists}`);
      
      if (exists) {
        const rawState = await redis.hgetall(stateKey);
        console.log(`   Raw state keys:`, Object.keys(rawState));
        console.log(`   Raw state:`, rawState);
      }
      
      return;
    }
    
    console.log(`📋 Game ${gameId} found:`);
    console.log(`   FEN: ${gameState.fen}`);
    console.log(`   Game Over: ${gameState.gameOver}`);
    console.log(`   Result: ${gameState.result}`);
    console.log(`   White Player: ${gameState.whitePlayerId}`);
    console.log(`   Black Player: ${gameState.blackPlayerId}`);
    
    // Get action history
    const actions = await getActionHistory(gameId);
    console.log(`   Actions: ${actions.length}`);
    
    // Get move times
    const moveTimes = await getMoveTimes(gameId);
    console.log(`   Move times: ${moveTimes.length}`);
    
    // Check if we have player IDs
    if (!gameState.whitePlayerId || !gameState.blackPlayerId) {
      console.log(`⚠️  Missing player IDs - attempting to save anyway...`);
    }
    
    try {
      // Attempt to save to database
      await saveCompletedGame(gameId);
      console.log(`✅ Successfully saved game to database`);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        console.log(`ℹ️  Game already exists in database`);
      } else {
        console.error(`❌ Error saving game:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await redis.quit();
    process.exit(0);
  }
}

// Get game ID from command line
const gameId = process.argv[2];
if (!gameId) {
  console.error('Usage: npx tsx scripts/force-save-game.ts <game-id>');
  process.exit(1);
}

// Run the save
forceSaveGame(gameId).catch(console.error);