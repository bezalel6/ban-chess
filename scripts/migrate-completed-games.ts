/**
 * Utility script to find completed games in Redis and save them to the database
 * This fixes games that ended but weren't persisted due to server restarts or errors
 */

import { redis, getGameState } from '../server/redis';
import { saveCompletedGame } from '../server/services/game-persistence';

async function migrateCompletedGames() {
  console.log('🔍 Searching for completed games in Redis...');
  
  try {
    // Find all game state keys
    const gameKeys = await redis.keys('game:*:state');
    console.log(`Found ${gameKeys.length} games in Redis`);
    
    let completed = 0;
    let migrated = 0;
    let errors = 0;
    
    for (const key of gameKeys) {
      // Extract game ID from key
      const gameId = key.split(':')[1];
      
      try {
        // Get game state
        const gameState = await getGameState(gameId);
        
        if (!gameState) {
          console.log(`⚠️  Game ${gameId}: No state found`);
          continue;
        }
        
        // Check if game is completed
        if (gameState.gameOver) {
          completed++;
          console.log(`\n📋 Game ${gameId}:`);
          console.log(`   Result: ${gameState.result}`);
          console.log(`   White: ${gameState.whitePlayerId || 'unknown'}`);
          console.log(`   Black: ${gameState.blackPlayerId || 'unknown'}`);
          
          // Check if we have player IDs
          if (!gameState.whitePlayerId || !gameState.blackPlayerId) {
            console.log(`   ⚠️  Missing player IDs - skipping`);
            continue;
          }
          
          try {
            // Attempt to save to database
            await saveCompletedGame(gameId);
            console.log(`   ✅ Successfully migrated to database`);
            migrated++;
          } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
              console.log(`   ℹ️  Already exists in database`);
            } else {
              console.log(`   ❌ Error saving: ${error instanceof Error ? error.message : String(error)}`);
              errors++;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing game ${gameId}:`, error);
        errors++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total games: ${gameKeys.length}`);
    console.log(`   Completed games: ${completed}`);
    console.log(`   Successfully migrated: ${migrated}`);
    console.log(`   Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await redis.quit();
    process.exit(0);
  }
}

// Run the migration
migrateCompletedGames().catch(console.error);