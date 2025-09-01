/**
 * Database-Redis Synchronization Service
 * Manages bidirectional sync between PostgreSQL (source of truth) and Redis (cache layer)
 */

import {
  db,
  games,
  gameCache,
  playerPresence,
  matchmakingQueue,
  connections,
} from '../db';
import {
  redis,
  KEYS,
  saveGameState,
  getGameState,
  addActionToHistory,
  getActionHistory,
} from '../redis';
import { eq, and, isNull, lt } from 'drizzle-orm';
import type { TimeControl } from '../../lib/game-types';

// Sync status types
type SyncStatus = 'pending' | 'synced' | 'failed' | 'stale';

interface SyncResult {
  success: boolean;
  error?: string;
  itemsSynced?: number;
}

/**
 * Sync game from PostgreSQL to Redis
 * Used when game is accessed and not in cache
 */
export async function syncGameToRedis(gameId: string): Promise<SyncResult> {
  try {
    // Get game from database
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        moves: {
          orderBy: (moves, { asc }) => [asc(moves.moveNumber)],
        },
        events: {
          orderBy: (gameEvents, { asc }) => [asc(gameEvents.timestamp)],
        },
      },
    });

    if (!game) {
      return { success: false, error: 'Game not found in database' };
    }

    // Prepare game state for Redis
    const gameState = {
      fen:
        game.fenFinal ||
        game.fenInitial ||
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 b:ban',
      pgn: game.pgn || '',
      whitePlayerId: game.whitePlayerId || '',
      blackPlayerId: game.blackPlayerId || '',
      isSoloGame: game.isSoloGame,
      startTime: game.startedAt.getTime(),
      lastMoveTime: game.completedAt?.getTime(),
      gameOver: !!game.result && game.result !== '*',
      result: game.result || '',
      timeControl: game.timeControl as TimeControl | undefined,
      moveCount: game.totalMoves,
    };

    // Save to Redis
    await saveGameState(gameId, gameState);

    // Rebuild action history from moves
    if (game.moves && game.moves.length > 0) {
      for (const move of game.moves) {
        const action = move.isBan
          ? `b:${move.uci || move.notation}`
          : `m:${move.notation}`;
        await addActionToHistory(gameId, action);
      }
    }

    // Update sync status in database
    await db
      .update(games)
      .set({
        redisSyncStatus: 'synced' as SyncStatus,
        redisSyncAt: new Date(),
      })
      .where(eq(games.id, gameId));

    // Update or create cache metadata
    await db
      .insert(gameCache)
      .values({
        gameId,
        cachedAt: new Date(),
        cacheTtl: game.completedAt ? 86400 : 14400, // 24h for completed, 4h for active
        accessCount: 1,
        lastAccessed: new Date(),
        cacheKey: KEYS.GAME(gameId),
        cacheVersion: 1,
      })
      .onConflictDoUpdate({
        target: gameCache.gameId,
        set: {
          cachedAt: new Date(),
          accessCount: 1,
          lastAccessed: new Date(),
        },
      });

    console.log(`[Sync] Game ${gameId} synced to Redis`);
    return { success: true, itemsSynced: 1 };
  } catch (error) {
    console.error(`[Sync] Error syncing game ${gameId} to Redis:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync game from Redis to PostgreSQL
 * Used periodically to persist game state
 */
export async function syncGameToDatabase(gameId: string): Promise<SyncResult> {
  try {
    // Get game state from Redis
    const gameState = await getGameState(gameId);
    if (!gameState) {
      return { success: false, error: 'Game not found in Redis' };
    }

    // Get action history
    const actionHistory = await getActionHistory(gameId);

    // Check if game exists in database
    const existingGame = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (existingGame) {
      // Update existing game
      await db
        .update(games)
        .set({
          fenFinal: gameState.fen,
          pgn: gameState.pgn,
          result: gameState.gameOver ? gameState.result : null,
          completedAt: gameState.gameOver
            ? new Date(gameState.lastMoveTime || Date.now())
            : null,
          totalMoves:
            gameState.moveCount ||
            actionHistory.filter(a => a.startsWith('m:')).length,
          totalBans: actionHistory.filter(a => a.startsWith('b:')).length,
          banMoves: actionHistory
            .filter(a => a.startsWith('b:'))
            .map(a => a.substring(2)),
          redisSyncStatus: 'synced' as SyncStatus,
          redisSyncAt: new Date(),
        })
        .where(eq(games.id, gameId));
    } else {
      // Create new game record
      await db.insert(games).values({
        id: gameId,
        whitePlayerId: gameState.whitePlayerId || null,
        blackPlayerId: gameState.blackPlayerId || null,
        fenInitial:
          'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 b:ban',
        fenFinal: gameState.fen,
        pgn: gameState.pgn,
        result: gameState.result || null,
        timeControl: gameState.timeControl,
        isSoloGame: gameState.isSoloGame,
        startedAt: new Date(gameState.startTime),
        completedAt: gameState.gameOver
          ? new Date(gameState.lastMoveTime || Date.now())
          : null,
        totalMoves: gameState.moveCount || 0,
        totalBans: actionHistory.filter(a => a.startsWith('b:')).length,
        banMoves: actionHistory
          .filter(a => a.startsWith('b:'))
          .map(a => a.substring(2)),
        redisSyncStatus: 'synced' as SyncStatus,
        redisSyncAt: new Date(),
      });
    }

    console.log(`[Sync] Game ${gameId} synced to database`);
    return { success: true, itemsSynced: 1 };
  } catch (error) {
    console.error(`[Sync] Error syncing game ${gameId} to database:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync player presence between database and Redis
 */
export async function syncPlayerPresence(
  userId: string,
  status: 'online' | 'offline' | 'in_game' | 'away'
): Promise<void> {
  try {
    // Update database
    await db
      .insert(playerPresence)
      .values({
        userId,
        status,
        lastHeartbeat: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: playerPresence.userId,
        set: {
          status,
          lastHeartbeat: new Date(),
          updatedAt: new Date(),
        },
      });

    // Update Redis
    if (status === 'online' || status === 'in_game') {
      await redis.sadd(KEYS.ONLINE_PLAYERS, userId);
    } else {
      await redis.srem(KEYS.ONLINE_PLAYERS, userId);
    }

    // Set player session in Redis with TTL
    await redis.setex(
      KEYS.PLAYER_SESSION(userId),
      3600, // 1 hour TTL
      JSON.stringify({
        userId,
        status,
        lastSeen: Date.now(),
      })
    );
  } catch (error) {
    console.error(`[Sync] Error syncing presence for user ${userId}:`, error);
  }
}

/**
 * Sync matchmaking queue between database and Redis
 */
export async function syncMatchmakingQueue(): Promise<SyncResult> {
  try {
    // Get pending queue entries from database
    const queueEntries = await db.query.matchmakingQueue.findFirst({
      where: and(
        eq(matchmakingQueue.matched, false),
        isNull(matchmakingQueue.matchedAt)
      ),
      with: {
        user: true,
      },
    });

    let itemsSynced = 0;

    // Clear Redis queue and rebuild from database
    await redis.del(KEYS.QUEUE);
    await redis.del(KEYS.QUEUE_SET);

    if (queueEntries) {
      // Add each entry to Redis queue
      for (const entry of [queueEntries]) {
        // Wrap in array since findFirst returns single item
        const queueData = JSON.stringify({
          userId: entry.userId,
          username: entry.user?.username || 'Unknown',
          joinedAt: entry.joinedAt.getTime(),
        });

        await redis.rpush(KEYS.QUEUE, queueData);
        await redis.sadd(KEYS.QUEUE_SET, entry.userId);
        itemsSynced++;
      }
    }

    console.log(`[Sync] Matchmaking queue synced: ${itemsSynced} entries`);
    return { success: true, itemsSynced };
  } catch (error) {
    console.error('[Sync] Error syncing matchmaking queue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync WebSocket connections
 */
export async function syncConnection(
  socketId: string,
  userId: string | null,
  action: 'connect' | 'disconnect'
): Promise<void> {
  try {
    if (action === 'connect') {
      await db.insert(connections).values({
        socketId,
        userId,
        connectedAt: new Date(),
        transport: 'websocket',
      });

      if (userId) {
        await syncPlayerPresence(userId, 'online');
      }
    } else {
      await db
        .update(connections)
        .set({
          disconnectedAt: new Date(),
        })
        .where(eq(connections.socketId, socketId));

      if (userId) {
        // Check if user has other active connections
        const activeConnections = await db.query.connections.findFirst({
          where: and(
            eq(connections.userId, userId),
            isNull(connections.disconnectedAt)
          ),
        });

        if (!activeConnections) {
          await syncPlayerPresence(userId, 'offline');
        }
      }
    }
  } catch (error) {
    console.error(`[Sync] Error syncing connection ${socketId}:`, error);
  }
}

/**
 * Batch sync all active games from Redis to database
 */
export async function batchSyncActiveGames(): Promise<SyncResult> {
  try {
    const activeGameIds = await redis.smembers('games:active');
    let successCount = 0;
    let errorCount = 0;

    for (const gameId of activeGameIds) {
      const result = await syncGameToDatabase(gameId);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    console.log(
      `[Sync] Batch sync completed: ${successCount} success, ${errorCount} errors`
    );
    return {
      success: errorCount === 0,
      itemsSynced: successCount,
    };
  } catch (error) {
    console.error('[Sync] Error in batch sync:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up stale cache entries
 */
export async function cleanupStaleCache(): Promise<void> {
  try {
    // Find stale cache entries
    const staleCacheEntries = await db.query.gameCache.findFirst({
      where: lt(
        gameCache.lastAccessed,
        new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours old
      ),
    });

    if (staleCacheEntries) {
      // Remove from Redis
      await redis.del(KEYS.GAME(staleCacheEntries.gameId));
      await redis.del(KEYS.GAME_HISTORY(staleCacheEntries.gameId));
      await redis.del(KEYS.GAME_EVENTS(staleCacheEntries.gameId));

      // Remove cache metadata
      await db
        .delete(gameCache)
        .where(eq(gameCache.gameId, staleCacheEntries.gameId));

      console.log(
        `[Sync] Cleaned up stale cache for game ${staleCacheEntries.gameId}`
      );
    }
  } catch (error) {
    console.error('[Sync] Error cleaning up stale cache:', error);
  }
}

/**
 * Initialize sync service with periodic tasks
 */
export function initializeSyncService(): void {
  // Sync active games every 5 minutes
  setInterval(
    () => {
      batchSyncActiveGames().catch(console.error);
    },
    5 * 60 * 1000
  );

  // Clean up stale cache every hour
  setInterval(
    () => {
      cleanupStaleCache().catch(console.error);
    },
    60 * 60 * 1000
  );

  // Sync matchmaking queue every 30 seconds
  setInterval(() => {
    syncMatchmakingQueue().catch(console.error);
  }, 30 * 1000);

  console.log('[Sync] Database-Redis sync service initialized');
}

// Export sync status type
export type { SyncStatus };
