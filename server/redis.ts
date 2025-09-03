import Redis from "ioredis";
import type { TimeControl, GameEvent } from "../lib/game-types";

// Type definitions for Redis data structures
export interface GameStateData {
  fen: string;
  pgn?: string; // Store PGN for full game reconstruction
  whitePlayerId?: string;
  blackPlayerId?: string;
  startTime: number;
  lastMoveTime?: number;
  gameOver?: boolean;
  result?: string;
  timeControl?: TimeControl;
  moveCount?: number; // Track number of moves for efficient updates
  finalClocks?: { white: { remaining: number; lastUpdate: number }; black: { remaining: number; lastUpdate: number } }; // Final clock values when game ends
}

// Action history stored as BCN (Ban Chess Notation) strings
// Example: ["b:e2e4", "m:d2d4", "b:e7e5", "m:d7d5"]
export type ActionHistory = string[];

interface PlayerSessionData {
  userId: string;
  username: string;
  currentGameId?: string;
  status: "online" | "in_game" | "queued";
  lastSeen: number;
}

interface QueuePlayerData {
  userId: string;
  username: string;
  joinedAt: number;
}

// Check if we're in a build environment where Redis shouldn't connect
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build';
const isStaticGeneration = process.env.NEXT_IS_STATIC_GENERATION === 'true';
const shouldSkipRedis = isBuildTime || isStaticGeneration;

// Redis connection configuration
// Use REDIS_URL if provided, otherwise default to localhost
// This allows both local development and production deployments to work
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

if (!shouldSkipRedis) {
  console.log("[Redis] Connecting to:", redisUrl.replace(/:[^:@]*@/, ":***@")); // Log URL with password hidden
} else {
  console.log("[Redis] Skipping connection during build phase");
}

// Create main Redis client for general operations
export const redis = new Redis(redisUrl, {
  retryStrategy: (times) => {
    // Don't retry during build time
    if (shouldSkipRedis) return null;
    
    const delay = Math.min(times * 50, 2000);
    console.log(`[Redis] Reconnecting attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err) => {
    if (shouldSkipRedis) return false;
    
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      console.log("[Redis] Reconnecting due to READONLY error");
      return true;
    }
    return false;
  },
  maxRetriesPerRequest: shouldSkipRedis ? 0 : 3,
  enableReadyCheck: !shouldSkipRedis,
  lazyConnect: true, // Enable lazy connection to prevent immediate connection during imports
});

// Create separate client for pub/sub (required by ioredis)
export const redisPub = redis.duplicate();
export const redisSub = redis.duplicate();

// Redis key prefixes for organization
export const KEYS = {
  GAME: (id: string) => `game:${id}`,
  GAME_STATE: (id: string) => `game:${id}:state`,  // Store full game state
  GAME_ACTIONS: (id: string) => `game:${id}:actions`,  // Store action history in BCN format
  GAME_PLAYERS: (id: string) => `game:${id}:players`,
  GAME_HISTORY: (id: string) => `game:${id}:history`,
  GAME_TIMERS: (id: string) => `game:${id}:timers`,
  GAME_MOVE_TIMES: (id: string) => `game:${id}:moveTimes`,  // Store time per action in milliseconds
  PLAYER_SESSION: (userId: string) => `player:${userId}:session`,
  PLAYER_GAME: (userId: string) => `player:${userId}:game`,
  QUEUE: "matchmaking:queue",
  QUEUE_SET: "matchmaking:queue:set", // Set to prevent duplicates
  ONLINE_PLAYERS: "players:online",
  STATS: {
    ACTIVE_GAMES: "stats:active_games",
    TOTAL_GAMES: "stats:total_games",
    ONLINE_COUNT: "stats:online_count",
  },
  CHANNELS: {
    GAME_MOVES: (id: string) => `channel:game:${id}:moves`,
    GAME_STATE: (id: string) => `channel:game:${id}:state`,
    QUEUE_UPDATE: "channel:queue:update",
    USER_UPDATE: "channel:user:update",
  },
  GAME_EVENTS: (id: string) => `game:${id}:events`,
  TIMER: (id: string) => `timer:${id}`,
} as const;

// Connection event handlers - only set up if not in build mode
if (!shouldSkipRedis) {
  redis.on("connect", () => {
    console.log("[Redis] ✅ Connected to Redis server");
  });

  redis.on("ready", () => {
    console.log("[Redis] ✅ Redis client ready");
  });

  redis.on("error", (err) => {
    // Check for authentication error
    if (err.message && err.message.includes("NOAUTH")) {
      console.error(
        "[Redis] ❌ Authentication failed - Redis requires a password",
      );
      console.error(
        "[Redis] Set REDIS_URL with password in environment: redis://:password@host:port",
      );
    } else {
      console.error("[Redis] ❌ Redis connection error:", err);
    }
  });

  redis.on("close", () => {
    console.log("[Redis] Connection closed");
  });

  redisSub.on("connect", () => {
    console.log("[Redis] ✅ Subscriber connected");
  });

  redisPub.on("connect", () => {
    console.log("[Redis] ✅ Publisher connected");
  });
} else {
  // During build time, suppress error events to prevent build failures
  redis.on("error", () => {
    // Silently ignore Redis errors during build
  });
  redisPub.on("error", () => {
    // Silently ignore Redis errors during build
  });
  redisSub.on("error", () => {
    // Silently ignore Redis errors during build
  });
}

// Helper function to safely execute Redis operations during build time
async function _safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (shouldSkipRedis) {
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error("[Redis] Operation failed:", error);
    return fallback;
  }
}

// Helper functions for common operations

/**
 * Store game state in Redis with automatic expiration
 */
export async function saveGameState(
  gameId: string,
  gameData: GameStateData,
): Promise<void> {
  const pipeline = redis.pipeline();
  const key = KEYS.GAME(gameId);

  // Store main game data as hash
  const hashData: Record<string, string | number> = {
    fen: gameData.fen,
    pgn: gameData.pgn || "",
    whitePlayerId: gameData.whitePlayerId || "",
    blackPlayerId: gameData.blackPlayerId || "",
    startTime: gameData.startTime || Date.now(),
    lastMoveTime: Date.now(),
    gameOver: gameData.gameOver ? "1" : "0",
    result: gameData.result || "",
    moveCount: gameData.moveCount || 0,
  };

  // Store time control if present
  if (gameData.timeControl) {
    hashData.timeControlInitial = gameData.timeControl.initial;
    hashData.timeControlIncrement = gameData.timeControl.increment;
  }

  pipeline.hset(key, hashData);

  // Set expiration (24 hours for completed games, 4 hours for active)
  const ttl = gameData.gameOver ? 86400 : 14400;
  pipeline.expire(key, ttl);

  // Update active games counter
  if (!gameData.gameOver) {
    pipeline.sadd("games:active", gameId);
  } else {
    pipeline.srem("games:active", gameId);
  }

  await pipeline.exec();
}

/**
 * Store an action in the game history using BCN format
 */
export async function addActionToHistory(
  gameId: string,
  action: string,
): Promise<void> {
  const key = KEYS.GAME_HISTORY(gameId);

  const pipeline = redis.pipeline();
  pipeline.rpush(key, action); // Store BCN string directly
  pipeline.expire(key, 86400); // 24 hour expiration
  await pipeline.exec();
}

/**
 * Get complete action history for a game as BCN strings
 */
export async function getActionHistory(gameId: string): Promise<ActionHistory> {
  const key = KEYS.GAME_HISTORY(gameId);
  const history = await redis.lrange(key, 0, -1);
  return history; // Already in BCN format
}

/**
 * Track the time taken for an action (in milliseconds)
 */
export async function addMoveTime(gameId: string, timeMs: number): Promise<void> {
  const key = KEYS.GAME_MOVE_TIMES(gameId);
  
  const pipeline = redis.pipeline();
  pipeline.rpush(key, timeMs.toString());
  pipeline.expire(key, 86400); // 24 hour expiration
  await pipeline.exec();
}

/**
 * Get all move times for a game (in milliseconds)
 */
export async function getMoveTimes(gameId: string): Promise<number[]> {
  const key = KEYS.GAME_MOVE_TIMES(gameId);
  const times = await redis.lrange(key, 0, -1);
  return times.map(t => parseInt(t, 10));
}

/**
 * Retrieve game state from Redis
 */
export async function getGameState(
  gameId: string,
): Promise<GameStateData | null> {
  const key = KEYS.GAME(gameId);
  const data = await redis.hgetall(key);

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  const gameStateData: GameStateData = {
    fen: data.fen,
    pgn: data.pgn || undefined,
    whitePlayerId: data.whitePlayerId || undefined,
    blackPlayerId: data.blackPlayerId || undefined,
    startTime: parseInt(data.startTime),
    lastMoveTime: parseInt(data.lastMoveTime),
    gameOver: data.gameOver === "1",
    result: data.result || undefined,
    moveCount: data.moveCount ? parseInt(data.moveCount) : 0,
  };

  // Retrieve time control if present
  if (data.timeControlInitial && data.timeControlIncrement) {
    gameStateData.timeControl = {
      initial: parseInt(data.timeControlInitial),
      increment: parseInt(data.timeControlIncrement),
    };
  }

  return gameStateData;
}

/**
 * Add player to matchmaking queue
 */
export async function addToQueue(
  userId: string,
  username: string,
): Promise<number> {
  // Check if already in queue using set
  const isInQueue = await redis.sismember(KEYS.QUEUE_SET, userId);
  if (isInQueue) {
    // Get current position
    const queue = await redis.lrange(KEYS.QUEUE, 0, -1);
    const position = queue.findIndex((data) => {
      const parsed = JSON.parse(data);
      return parsed.userId === userId;
    });
    return position + 1;
  }

  // Add to queue
  const playerData = JSON.stringify({ userId, username, joinedAt: Date.now() });
  await redis
    .multi()
    .rpush(KEYS.QUEUE, playerData)
    .sadd(KEYS.QUEUE_SET, userId)
    .exec();

  // Return new queue length
  return await redis.llen(KEYS.QUEUE);
}

/**
 * Remove player from matchmaking queue
 */
export async function removeFromQueue(userId: string): Promise<void> {
  // Get all queue items
  const queue = await redis.lrange(KEYS.QUEUE, 0, -1);

  // Find and remove the player's entry
  for (let i = 0; i < queue.length; i++) {
    const data = JSON.parse(queue[i]);
    if (data.userId === userId) {
      // Remove by value (one occurrence)
      await redis.lrem(KEYS.QUEUE, 1, queue[i]);
      break;
    }
  }

  // Remove from set
  await redis.srem(KEYS.QUEUE_SET, userId);
}

/**
 * Get next two players from queue for matching
 */
export async function getPlayersForMatch(): Promise<
  [QueuePlayerData, QueuePlayerData] | null
> {
  // Pop two players atomically
  const players = await redis.multi().lpop(KEYS.QUEUE).lpop(KEYS.QUEUE).exec();

  if (!players || !players[0][1] || !players[1][1]) {
    // If we couldn't get two players, put any back
    if (players && players[0][1]) {
      await redis.lpush(KEYS.QUEUE, players[0][1] as string);
    }
    return null;
  }

  const player1 = JSON.parse(players[0][1] as string);
  const player2 = JSON.parse(players[1][1] as string);

  // Remove from queue set
  await redis
    .multi()
    .srem(KEYS.QUEUE_SET, player1.userId)
    .srem(KEYS.QUEUE_SET, player2.userId)
    .exec();

  return [player1, player2];
}

/**
 * Store player session
 */
export async function savePlayerSession(
  userId: string,
  sessionData: PlayerSessionData,
): Promise<void> {
  const key = KEYS.PLAYER_SESSION(userId);
  await redis.set(
    key,
    JSON.stringify({
      ...sessionData,
      lastSeen: Date.now(),
    }),
    "EX",
    3600,
  );

  // Add to online players set
  await redis.sadd(KEYS.ONLINE_PLAYERS, userId);
}

/**
 * Remove player session
 */
export async function removePlayerSession(userId: string): Promise<void> {
  await redis
    .multi()
    .del(KEYS.PLAYER_SESSION(userId))
    .srem(KEYS.ONLINE_PLAYERS, userId)
    .exec();
}

/**
 * Get all active games (for monitoring/admin)
 */
export async function getActiveGames(): Promise<string[]> {
  return await redis.smembers("games:active");
}

/**
 * Clean up expired data (call periodically)
 */
export async function cleanupExpiredData(): Promise<void> {
  // Only log in development mode
  if (process.env.NODE_ENV === "development") {
    console.log("[Redis] Running cleanup task...");
  }

  // Remove inactive games from active set
  const activeGames = await getActiveGames();
  let cleanedGames = 0;
  for (const gameId of activeGames) {
    const exists = await redis.exists(KEYS.GAME(gameId));
    if (!exists) {
      await redis.srem("games:active", gameId);
      cleanedGames++;
      console.log(`[Redis] Removed expired game from active set: ${gameId}`);
    }
  }

  // Clean up orphaned player sessions
  const onlinePlayers = await redis.smembers(KEYS.ONLINE_PLAYERS);
  let cleanedPlayers = 0;
  for (const userId of onlinePlayers) {
    const exists = await redis.exists(KEYS.PLAYER_SESSION(userId));
    if (!exists) {
      await redis.srem(KEYS.ONLINE_PLAYERS, userId);
      cleanedPlayers++;
      console.log(`[Redis] Removed expired player from online set: ${userId}`);
    }
  }

  // Log summary only if something was cleaned in production
  if (cleanedGames > 0 || cleanedPlayers > 0) {
    console.log(`[Redis] Cleanup completed: ${cleanedGames} games, ${cleanedPlayers} players removed`);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredData, 5 * 60 * 1000);

/**
 * Store a game event in Redis
 */
export async function addGameEvent(
  gameId: string,
  event: GameEvent,
): Promise<void> {
  const key = KEYS.GAME_EVENTS(gameId);
  await redis.rpush(key, JSON.stringify(event));
  // Expire after 24 hours to prevent memory bloat
  await redis.expire(key, 24 * 60 * 60);
}

/**
 * Get all events for a game
 */
export async function getGameEvents(gameId: string): Promise<GameEvent[]> {
  const key = KEYS.GAME_EVENTS(gameId);
  const events = await redis.lrange(key, 0, -1);
  return events.map((e) => JSON.parse(e) as GameEvent);
}

/**
 * Get recent events for a game (last N events)
 */
export async function getRecentGameEvents(
  gameId: string,
  count: number = 20,
): Promise<GameEvent[]> {
  const key = KEYS.GAME_EVENTS(gameId);
  const events = await redis.lrange(key, -count, -1);
  return events.map((e) => JSON.parse(e) as GameEvent);
}

// Graceful shutdown with timeout
export async function shutdown(): Promise<void> {
  console.log("[Redis] Closing connections...");
  
  // Create promises with timeouts for each connection
  const closeWithTimeout = (client: Redis, name: string) => {
    return Promise.race([
      client.quit().then(() => {
        console.log(`[Redis] ${name} connection closed gracefully`);
      }),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log(`[Redis] ${name} connection close timeout, disconnecting...`);
          client.disconnect();
          resolve();
        }, 3000); // 3 second timeout per connection
      })
    ]);
  };
  
  try {
    await Promise.all([
      closeWithTimeout(redis, "Main"),
      closeWithTimeout(redisPub, "Publisher"),
      closeWithTimeout(redisSub, "Subscriber")
    ]);
    console.log("[Redis] All connections closed");
  } catch (err) {
    console.error("[Redis] Error during shutdown:", err);
    // Force disconnect all clients
    redis.disconnect();
    redisPub.disconnect();
    redisSub.disconnect();
  }
}
