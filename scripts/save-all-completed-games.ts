/**
 * Script to save all completed games from Redis to the database
 */

import { PrismaClient } from '@prisma/client';
import { createRedisClient } from '../server/redis';
import { saveCompletedGame } from '../server/services/game-persistence';

const prisma = new PrismaClient();

async function saveAllCompletedGames() {
  const redis = await createRedisClient();
  
  try {
    console.log('🔍 Searching for completed games in Redis...');
    
    // Get all game keys
    const keys = await redis.keys('game:*');
    const gameKeys = keys.filter(k => k.match(/^game:[a-f0-9-]+$/));
    
    console.log(`Found ${gameKeys.length} game keys in Redis`);
    
    let completed = 0;
    let saved = 0;
    let errors = 0;
    
    for (const key of gameKeys) {
      const gameId = key.replace('game:', '');
      
      // Check if game is completed
      const gameOver = await redis.hget(key, 'gameOver');
      
      if (gameOver === '1') {
        completed++;
        const result = await redis.hget(key, 'result');
        console.log(`\nGame ${gameId}:`);
        console.log(`  Result: ${result}`);
        
        // Check if already in database
        const existingGame = await prisma.game.findUnique({
          where: { id: gameId }
        });
        
        if (existingGame) {
          console.log('  ✅ Already in database, skipping');
          continue;
        }
        
        // Ensure users exist in database
        const whitePlayerId = await redis.hget(key, 'whitePlayerId');
        const blackPlayerId = await redis.hget(key, 'blackPlayerId');
        
        if (whitePlayerId) {
          await prisma.user.upsert({
            where: { id: whitePlayerId },
            update: {},
            create: {
              id: whitePlayerId,
              username: `user_${whitePlayerId.slice(0, 8)}`,
              isGuest: true
            }
          });
        }
        
        if (blackPlayerId && blackPlayerId !== whitePlayerId) {
          await prisma.user.upsert({
            where: { id: blackPlayerId },
            update: {},
            create: {
              id: blackPlayerId,
              username: `user_${blackPlayerId.slice(0, 8)}`,
              isGuest: true
            }
          });
        }
        
        // Save to database
        try {
          await saveCompletedGame(gameId);
          console.log('  ✅ Saved to database');
          saved++;
        } catch (error) {
          console.log('  ❌ Error saving:', (error as Error).message);
          errors++;
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total games: ${gameKeys.length}`);
    console.log(`   Completed games: ${completed}`);
    console.log(`   Successfully saved: ${saved}`);
    console.log(`   Errors: ${errors}`);
    
  } finally {
    await redis.quit();
    await prisma.$disconnect();
  }
}

saveAllCompletedGames().catch(console.error);