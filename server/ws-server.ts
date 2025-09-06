// Load environment variables from .env.local
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local file for environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { WebSocketServer, WebSocket } from "ws";
import { BanChess } from "ban-chess.ts";
import type {
  SimpleServerMsg,
  SimpleClientMsg,
  HistoryEntry,
  TimeControl,
  GameEvent,
  PlayerClock,
} from "../lib/game-types";
import { v4 as uuidv4 } from "uuid";
import { TimeManager } from "./time-manager";
import { validateNextAuthToken } from "./auth-validation";
import {
  redis,
  redisPub,
  redisSub,
  KEYS,
  saveGameState,
  getGameState,
  addToQueue,
  removeFromQueue,
  getPlayersForMatch,
  savePlayerSession,
  removePlayerSession,
  shutdown as redisShutdown,
  getActionHistory,
  addGameEvent,
  getRecentGameEvents as _getRecentGameEvents,
} from "./redis";
import { saveCompletedGame } from "./services/game-persistence";
import {
  getGameSource,
  reconstructGameFromBCN,
} from "./services/game-retrieval";
import { GameService } from "./services/game-service";

// Optional imports for new features - won't break if files don't exist yet
let ensureDbSchema: (() => Promise<void>) | undefined;
let runDataMigrations: (() => Promise<void>) | undefined;
let initializeAdmins: (() => Promise<void>) | undefined;

try {
  const dbMigration = require("../lib/db-migration");
  ensureDbSchema = dbMigration.ensureDbSchema;
  runDataMigrations = dbMigration.runDataMigrations;
} catch {
  console.log("[WebSocket] db-migration module not found, skipping schema checks");
}

try {
  const startupAdmin = require("../lib/startup-admin");
  initializeAdmins = startupAdmin.initializeAdmins;
} catch {
  console.log("[WebSocket] startup-admin module not found, skipping admin initialization");
}

// Import the type from redis
type GameStateData = Awaited<ReturnType<typeof getGameState>>;

const SAVE_PRACTICE_GAMES = true;
/**
 * Centralized handler for all game-ending scenarios
 * Handles saving game state and persisting to database
 */
async function handleGameEnd(
  gameId: string,
  result: string,
  gameState: NonNullable<GameStateData>
): Promise<void> {
  const startTime = Date.now();

  // Capture final clock values before stopping the timer
  const timeManager = timeManagers.get(gameId);
  let finalClocks: { white: PlayerClock; black: PlayerClock } | undefined = undefined;
  if (timeManager) {
    finalClocks = timeManager.getClocks();
  }
  
  // Update game state with final clocks
  gameState.gameOver = true;
  gameState.result = result;
  if (finalClocks) {
    gameState.finalClocks = finalClocks;
  }
  await saveGameState(gameId, gameState);
  console.log(
    `[handleGameEnd] Saved game state in ${Date.now() - startTime}ms`
  );

  // Now stop any active timers
  if (timeManager) {
    timeManager.destroy();
    timeManagers.delete(gameId);
  }

  // Persist to database (skip local games where same player plays both sides)
  if (
    (gameState.whitePlayerId &&
      gameState.blackPlayerId &&
      gameState.whitePlayerId !== gameState.blackPlayerId) ||
    SAVE_PRACTICE_GAMES
  ) {
    try {
      const dbStart = Date.now();
      await saveCompletedGame(gameId);
      console.log(
        `[GameEnd] Game ${gameId} saved to database in ${
          Date.now() - dbStart
        }ms`
      );

      // Clean up Redis data immediately after successful database save
      // Since database now has priority for completed games, we can safely remove from Redis
      try {
        const pipeline = redis.pipeline();
        pipeline.del(KEYS.GAME_STATE(gameId));
        pipeline.del(KEYS.GAME_ACTIONS(gameId));
        pipeline.del(KEYS.GAME_MOVE_TIMES(gameId));

        // Remove player-game associations if they exist
        if (gameState.whitePlayerId) {
          const whiteGameId = await redis.get(
            KEYS.PLAYER_GAME(gameState.whitePlayerId)
          );
          if (whiteGameId === gameId) {
            pipeline.del(KEYS.PLAYER_GAME(gameState.whitePlayerId));
          }
        }
        if (gameState.blackPlayerId) {
          const blackGameId = await redis.get(
            KEYS.PLAYER_GAME(gameState.blackPlayerId)
          );
          if (blackGameId === gameId) {
            pipeline.del(KEYS.PLAYER_GAME(gameState.blackPlayerId));
          }
        }

        await pipeline.exec();
        console.log(
          `[GameEnd] Cleaned up Redis data for game ${gameId} - database is now the authoritative source`
        );
      } catch (cleanupError) {
        console.error(
          `[GameEnd] Failed to clean up Redis data for game ${gameId}:`,
          cleanupError
        );
      }
    } catch (error) {
      console.error(
        `[GameEnd] Failed to save game ${gameId} to database:`,
        error
      );
    }
  } else {
    console.log(`[GameEnd] Skipping database save for local game ${gameId}`);
    // For games not saved to database, keep in Redis briefly then clean up
    setTimeout(async () => {
      try {
        const pipeline = redis.pipeline();
        pipeline.del(KEYS.GAME_STATE(gameId));
        pipeline.del(KEYS.GAME_ACTIONS(gameId));
        pipeline.del(KEYS.GAME_MOVE_TIMES(gameId));
        await pipeline.exec();
        console.log(
          `[GameEnd] Cleaned up unsaved game ${gameId} from Redis after 1 minute`
        );
      } catch (error) {
        console.error(
          `[GameEnd] Failed to clean up unsaved game ${gameId}:`,
          error
        );
      }
    }, 60 * 1000); // 1 minute delay for unsaved games
  }
}

interface Player {
  userId: string;
  username: string;
  ws: WebSocket;
  authMessageSent?: boolean; // Track if we've sent auth confirmation
}

// In-memory cache for active connections and time managers
// These don't need Redis as they're connection-specific
const authenticatedPlayers = new Map<WebSocket, Player>();
const timeManagers = new Map<string, TimeManager>();
// Game state deduplication cache to prevent WebSocket spam
const lastBroadcastStates = new Map<string, string>();
// Message deduplication tracking
let messageIdCounter = 0;
const sentMessageIds = new Map<WebSocket, Set<string>>(); // Track sent message IDs per connection

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : process.env.NODE_ENV === "production"
  ? ["https://chess.rndev.site"]
  : ["http://localhost:3000", "http://localhost:3001"];

const wss = new WebSocketServer({
  port: 3001,
  verifyClient: async (info, cb) => {
    // Check CORS origin
    const origin = info.origin || info.req.headers.origin;

    if (origin) {
      const isAllowed = allowedOrigins.some((allowed) => {
        // Allow exact match or wildcard for development
        return (
          allowed === "*" ||
          origin === allowed ||
          (process.env.NODE_ENV !== "production" &&
            origin.startsWith("http://localhost"))
        );
      });

      if (!isAllowed) {
        console.log(
          `[WebSocket] Blocked connection from unauthorized origin: ${origin}`
        );
        cb(false, 403, "Forbidden: Invalid origin");
        return;
      }
    }

    // Validate NextAuth token during WebSocket handshake
    const token = await validateNextAuthToken(info.req);
    if (token) {
      // Store the validated token on the request for later use
      const reqWithAuth = info.req as typeof info.req & {
        authToken: typeof token;
      };
      reqWithAuth.authToken = token;
    }
    
    // In development, allow connections without auth (they'll be treated as guests)
    // In production, require authentication
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!token && !isDevelopment) {
      console.log('[WebSocket] Rejecting unauthenticated connection in production mode');
      cb(false, 401, "Unauthorized");
    } else {
      if (!token) {
        console.log('[WebSocket] Allowing unauthenticated connection in development mode (will be treated as guest)');
      }
      cb(true);
    }
  },
});

// Enhanced startup logging with environment validation
console.log("\n" + "=".repeat(60));
console.log("🎮 BanChess WebSocket Server Starting...");
console.log("=".repeat(60));
console.log(`📍 Port: 3001`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔗 Allowed origins: ${allowedOrigins.join(", ")}`);
console.log(
  `📦 Redis URL: ${process.env.REDIS_URL || "redis://localhost:6379"}`
);
console.log(
  `🔐 NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'Configured' : 'NOT CONFIGURED'}`
);

// Check Redis connection on startup
redis
  .ping()
  .then(() => {
    console.log("✅ Redis connection: OK");
  })
  .catch((err) => {
    console.error("❌ Redis connection FAILED:", err.message);
    console.error("🔍 Troubleshooting:");
    console.error("   1. Check if Redis is running: docker ps");
    console.error("   2. Start Redis: docker run -d -p 6379:6379 redis");
    console.error("   3. Verify connection: redis-cli ping");
  });

// Initialize database schema and admin users on startup
(async () => {
  try {
    if (ensureDbSchema) {
      console.log("🔧 Checking database schema...");
      await ensureDbSchema();
      console.log("✅ Database schema: OK");
    }
    
    if (runDataMigrations) {
      console.log("📊 Running data migrations...");
      await runDataMigrations();
      console.log("✅ Data migrations: Complete");
    }
    
    if (initializeAdmins) {
      console.log("👤 Initializing admin users...");
      await initializeAdmins();
      console.log("✅ Admin initialization: Complete");
    }
  } catch (error) {
    console.error("❌ Startup initialization error:", error);
    // Don't exit - server can still run for non-admin users
  }
})();

console.log("\n📝 Quick Reference:");
console.log("   • WebSocket URL: ws://localhost:3001");
console.log("   • Graceful shutdown: Ctrl+C");
console.log("=".repeat(60) + "\n");
console.log(
  `[WebSocket] NEXTAUTH_SECRET loaded: ${!!process.env.NEXTAUTH_SECRET}`
);
console.log(
  `[WebSocket] NEXT_PUBLIC_WEBSOCKET_URL: ${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`
);

// Subscribe to Redis pub/sub channels for cross-server communication
async function setupRedisPubSub() {
  // Subscribe to queue updates and user updates
  await redisSub.subscribe(KEYS.CHANNELS.QUEUE_UPDATE);
  await redisSub.subscribe(KEYS.CHANNELS.USER_UPDATE);

  redisSub.on("message", async (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (channel === KEYS.CHANNELS.QUEUE_UPDATE) {
        // Notify players in queue about position updates
        const { userId, position } = data;
        const player = Array.from(authenticatedPlayers.values()).find(
          (p) => p.userId === userId
        );
        if (player && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(
            JSON.stringify({
              type: "queued",
              position,
            } as SimpleServerMsg)
          );
        }
      } else if (channel === KEYS.CHANNELS.USER_UPDATE) {
        // Handle username changes
        const { userId, type, oldUsername, newUsername, timestamp } = data;

        if (type === "username-change") {
          // Update the in-memory player data
          const player = Array.from(authenticatedPlayers.values()).find(
            (p) => p.userId === userId
          );

          if (player) {
            player.username = newUsername;

            // Notify the player about their username change
            if (player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(
                JSON.stringify({
                  type: "username-changed",
                  oldUsername,
                  newUsername,
                  timestamp,
                  message:
                    "Your username has been updated. Please sign out and back in to refresh your session.",
                } as SimpleServerMsg)
              );
            }
          }

          // Notify all players in the same game about the username change
          const gameId = await redis.get(KEYS.PLAYER_GAME(userId));
          if (gameId) {
            const gameState = await getGameState(gameId);
            if (gameState) {
              // Find all connected players in this game
              const gamePlayers = Array.from(
                authenticatedPlayers.values()
              ).filter((p) => {
                return (
                  p.userId === gameState.whitePlayerId ||
                  p.userId === gameState.blackPlayerId
                );
              });

              // Notify them about the username change
              gamePlayers.forEach((gamePlayer) => {
                if (
                  gamePlayer.ws.readyState === WebSocket.OPEN &&
                  gamePlayer.userId !== userId
                ) {
                  gamePlayer.ws.send(
                    JSON.stringify({
                      type: "opponent-username-changed",
                      oldUsername,
                      newUsername,
                      playerId: userId,
                    } as SimpleServerMsg)
                  );
                }
              });
            }
          }

          console.log(
            `[WebSocket] Username changed: ${oldUsername} → ${newUsername}`
          );
        }
      } else if (channel.startsWith("channel:game:")) {
        // Handle game-specific messages
        const gameId = channel.split(":")[2];
        await handleGameChannelMessage(gameId, data);
      }
    } catch (err) {
      console.error(
        `[Redis] Error handling message on channel ${channel}:`,
        err
      );
    }
  });
}

setupRedisPubSub().catch(console.error);

async function handleGameChannelMessage(gameId: string, data: SimpleServerMsg) {
  // Get game state from Redis
  const gameState = await getGameState(gameId);
  if (!gameState) return;

  // Find connected players for this game
  const connectedPlayers = Array.from(authenticatedPlayers.values()).filter(
    (p) => {
      return (
        p.userId === gameState.whitePlayerId ||
        p.userId === gameState.blackPlayerId
      );
    }
  );

  // Broadcast to connected players
  connectedPlayers.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(data));
    }
  });
}

interface GameStateWithPlayers {
  whitePlayerId?: string;
  blackPlayerId?: string;
}

async function getPlayerInfo(gameState: GameStateWithPlayers): Promise<{
  white?: { id: string; username: string };
  black?: { id: string; username: string };
}> {
  const players: {
    white?: { id: string; username: string };
    black?: { id: string; username: string };
  } = {};

  if (gameState.whitePlayerId) {
    const whiteSession = await redis.get(
      KEYS.PLAYER_SESSION(gameState.whitePlayerId)
    );
    if (whiteSession) {
      const session = JSON.parse(whiteSession);
      players.white = {
        id: gameState.whitePlayerId,
        username: session.username,
      };
    }
  }

  if (gameState.blackPlayerId) {
    const blackSession = await redis.get(
      KEYS.PLAYER_SESSION(gameState.blackPlayerId)
    );
    if (blackSession) {
      const session = JSON.parse(blackSession);
      players.black = {
        id: gameState.blackPlayerId,
        username: session.username,
      };
    }
  }

  return players;
}

// Clean up all game data when a game ends
// Note: cleanupFinishedGame removed - we now persist game data to database instead of deleting it

/**
 * Determine the reason for game ending based on game state and position
 */
function determineResultReason(game: BanChess, gameState: NonNullable<GameStateData>): string {
  // Check flags set during game ending
  if (gameState.timedOut) {
    return "timeout";
  }
  if (gameState.resigned) {
    return "resignation";
  }
  
  // Check position-based endings
  if (game.inCheckmate()) {
    return "checkmate";
  }
  if (game.inStalemate()) {
    return "stalemate";
  }
  
  // Default to unknown
  return "unknown";
}

async function handleTimeout(gameId: string, winner: "white" | "black") {
  const gameState = await getGameState(gameId);
  if (!gameState) return;

  console.log(
    `[handleTimeout] Player ${
      winner === "white" ? "black" : "white"
    } ran out of time in game ${gameId}`
  );

  // Capture final clocks before stopping the time manager
  const timeManager = timeManagers.get(gameId);
  if (timeManager) {
    const finalClocks = timeManager.getClocks();
    if (finalClocks && gameState) {
      gameState.finalClocks = finalClocks;
    }
    timeManager.destroy();
    timeManagers.delete(gameId);
  }

  // Reconstruct game from action history to get full PGN
  const actionHistory = await getActionHistory(gameId);
  let game: BanChess;
  if (actionHistory.length > 0) {
    game = BanChess.replayFromActions(actionHistory);
  } else {
    game = new BanChess(gameState.fen);
  }

  // Update game state in Redis with final PGN
  gameState.pgn = game.pgn(); // Store final PGN
  // Mark that this game ended due to timeout
  gameState.timedOut = true;
  // Use standardized chess notation for result
  const standardResult = winner === "white" ? "1-0" : "0-1";
  await handleGameEnd(
    gameId,
    standardResult,
    gameState
  );

  // Send timeout message via pub/sub for all servers
  const timeoutMsg: SimpleServerMsg = {
    type: "timeout",
    gameId,
    winner,
  };

  await redisPub.publish(
    KEYS.CHANNELS.GAME_STATE(gameId),
    JSON.stringify(timeoutMsg)
  );

  // Also send state update
  const stateMsg: SimpleServerMsg = {
    type: "state",
    fen: gameState.fen,
    gameId,
    players: await getPlayerInfo(gameState),
    gameOver: true,
    result: gameState.result,
    history: game.history().map((entry) => ({
      ...entry,
      turnNumber: Math.floor(entry.ply / 4) + 1, // Calculate turn number from ply
      bannedMove: entry.bannedMove === null ? undefined : entry.bannedMove,
    })),
    timeControl: gameState.timeControl,
    clocks: timeManager ? timeManager.getClocks() : gameState.finalClocks,
  };

  await redisPub.publish(
    KEYS.CHANNELS.GAME_STATE(gameId),
    JSON.stringify(stateMsg)
  );

  // Note: We don't clean up Redis data anymore - it's persisted to database
}

async function broadcastClockUpdate(gameId: string) {
  const gameState = await getGameState(gameId);
  if (!gameState) return;

  const timeManager = timeManagers.get(gameId);
  if (!timeManager) return;

  const clockMsg: SimpleServerMsg = {
    type: "clock-update",
    gameId,
    clocks: timeManager.getClocks(),
  };

  // Publish to Redis for all servers
  await redisPub.publish(
    KEYS.CHANNELS.GAME_STATE(gameId),
    JSON.stringify(clockMsg)
  );
}

// Restore time manager for an active game (used after reconnection)
async function restoreTimeManager(
  gameId: string,
  gameState: GameStateWithPlayers & {
    timeControl?: TimeControl;
    gameOver?: boolean;
    result?: string;
    startTime: number;
    fen: string;
  }
) {
  // Only restore if game has time control and is not over
  // Check both gameOver flag and result field to ensure game is truly active
  if (
    !gameState.timeControl ||
    gameState.gameOver ||
    gameState.result ||
    timeManagers.has(gameId)
  ) {
    console.log(
      `[restoreTimeManager] Not restoring timer for game ${gameId}: gameOver=${
        gameState.gameOver
      }, result=${gameState.result}, hasTimeManager=${timeManagers.has(gameId)}`
    );
    return;
  }

  // Create new time manager
  const timeManager = new TimeManager(
    gameState.timeControl,
    (winner) => handleTimeout(gameId, winner),
    () => broadcastClockUpdate(gameId)
  );

  // TODO: In production you'd need to track actual time spent per player
  // For now, we just restart the timer for the current player

  // Determine current player using ban-chess.ts v3.0.0 APIs
  const game = new BanChess(gameState.fen);
  const currentPlayer = game.getActivePlayer();

  // Start the timer for the current player
  timeManager.start(currentPlayer);
  timeManagers.set(gameId, timeManager);

  console.log(
    `[restoreTimeManager] Restored timer for game ${gameId}, current player: ${currentPlayer}`
  );
}

// Send full game state with history - used for new joiners/reconnections
async function sendFullGameState(gameId: string, ws: WebSocket) {
  // First try Redis for active games, then database for completed games
  const gameSource = await getGameSource(gameId);

  // Use unified data whether from Redis or database
  if (gameSource) {
    // Reconstruct game from BCN (the source of truth)
    const game = reconstructGameFromBCN(gameSource.bcn);

    // Get current game state from BCN
    const fen = game.fen();
    const fenParts = fen.split(" ");
    const banState = fenParts[6];
    const ply = banState ? parseInt(banState.split(":")[0]) : 0;
    const activePlayer = game.getActivePlayer();
    const actionType = game.getActionType();
    const legalActions = game.getLegalActions();

    // For active games, also check the stored gameOver field in Redis
    // This ensures games marked as over in Redis are properly shown as over
    let isGameOver = game.gameOver();
    if (gameSource.type === "active") {
      const redisGameState = await getGameState(gameId);
      if (redisGameState?.gameOver) {
        isGameOver = true;
      }
    } else {
      // For completed games from database, they're always over
      isGameOver = true;
    }

    // Serialize legal actions
    const simpleLegalActions = legalActions
      .map((action) => BanChess.serializeAction(action))
      .filter((action): action is string => action !== null);

    // Convert history
    const history = game.history().map((entry) => ({
      ...entry,
      turnNumber: Math.floor(entry.ply / 4) + 1,
      bannedMove: entry.bannedMove === null ? undefined : entry.bannedMove,
    }));

    // Use usernames from gameSource which now always includes them
    const players = {
      white: {
        id: gameSource.whitePlayerId,
        username: gameSource.whiteUsername,
      },
      black: {
        id: gameSource.blackPlayerId,
        username: gameSource.blackUsername,
      },
    };

    // Get time manager if active
    const timeManager =
      gameSource.type === "active" ? timeManagers.get(gameId) : null;

    // Build the state message - same structure for active and completed games
    const clocks = timeManager ? timeManager.getClocks() : undefined;
    const fullStateMsg = {
      type: "state",
      fen,
      gameId,
      players,
      legalActions: isGameOver ? [] : simpleLegalActions,
      nextAction: isGameOver ? undefined : (actionType as "ban" | "move"),
      activePlayer: isGameOver ? undefined : activePlayer,
      ply,
      inCheck: game.inCheck(),
      history,
      actionHistory: gameSource.bcn, // Include BCN for navigation
      messageId: `state-full-${++messageIdCounter}`,
      gameOver: isGameOver,
      result: gameSource.result,
      dataSource: gameSource.type, // 'active' (Redis) or 'completed' (database)
      ...(gameSource.timeControl && {
        timeControl: parseTimeControl(gameSource.timeControl),
        clocks,
        startTime: Date.now(), // For completed games, this won't matter
      }),
    } as SimpleServerMsg & { messageId: string };

    // Send the unified state
    ws.send(JSON.stringify(fullStateMsg));
    // Only log for debugging if needed
    // console.log(`[sendFullGameState] Sent ${gameSource.type} game state for ${gameId}`);
    return;
  }

  // Game not found anywhere
  // console.log(`[sendFullGameState] Game ${gameId} not found in Redis or database`);
  ws.send(
    JSON.stringify({
      type: "error",
      message: "Game not found",
    } as SimpleServerMsg)
  );
}

// Helper function to parse time control string
function parseTimeControl(
  timeControlStr: string
): { initial: number; increment: number } | undefined {
  if (!timeControlStr || timeControlStr === "unlimited") {
    return undefined;
  }
  const [initial, increment] = timeControlStr.split("+").map(Number);
  if (!isNaN(initial) && !isNaN(increment)) {
    return { initial, increment };
  }
  return undefined;
}

/**
 * Helper function to check if the current position is checkmate,
 * even when the next action would be a ban (not a move).
 * This handles the case where checkmate exists before any ban occurs.
 */
function checkForImmediateCheckmate(game: BanChess): boolean {
  // Get the current turn from the chess position
  const fen = game.fen();
  const fenParts = fen.split(" ");
  const banState = fenParts[6];
  // Check if next action is ban by checking if ply is odd
  const ply = banState ? parseInt(banState.split(":")[0]) : 0;
  const isNextActionBan = ply % 2 === 1;

  // If it's time for a ban, we need to check if the player who would ban
  // is already in checkmate (can't escape even without a ban)
  if (isNextActionBan) {
    // Check if they're in check
    if (game.inCheck()) {
      // When it's time to ban but the player is in check, we need to verify
      // if there are any legal moves that could escape check after the ban.
      // Since the ban-chess library doesn't expose this directly during ban phase,
      // we check both the standard gameOver() and inCheckmate() methods.

      // The library's gameOver() should handle this, but let's make it explicit
      // by checking both conditions to ensure we catch all checkmate scenarios
      return game.inCheckmate() || game.gameOver();
    }
  }

  // Standard checkmate check for move phases
  return game.inCheckmate() || game.gameOver();
}

// Broadcast incremental updates - used after moves (no history needed)
async function broadcastGameState(gameId: string) {
  const gameState = await getGameState(gameId);
  if (!gameState) {
    console.log(`[broadcastGameState] Game ${gameId} not found in Redis`);
    return;
  }

  // Get the action history from Redis
  const storedActions = await getActionHistory(gameId);
  
  // Reconstruct game from action history to include full history with SAN
  const game = storedActions.length > 0 
    ? reconstructGameFromBCN(storedActions)
    : new BanChess(gameState.fen);

  // Get game state using new clean APIs (moved up to avoid duplicate declaration)
  const fen = game.fen();
  const ply = game.getPly();
  const activePlayer = game.getActivePlayer();
  const actionType = game.getActionType();
  const legalActions = game.getLegalActions();

  // Check for both immediate checkmate and standard game over conditions
  // IMPORTANT: Also check if there are no legal actions available (which means game over)
  const isGameOver =
    checkForImmediateCheckmate(game) || legalActions.length === 0;
  const isCheckmate =
    game.inCheckmate() || (game.inCheck() && legalActions.length === 0);
  const isStalemate =
    game.inStalemate() || (!game.inCheck() && legalActions.length === 0);

  // Only update game over state if it's not already set (e.g., from resignation)
  if (isGameOver && !gameState.gameOver) {
    console.log(
      `[broadcastGameState] GAME OVER in ${gameId}! Checkmate: ${isCheckmate}, Stalemate: ${isStalemate}, Legal actions: ${legalActions.length}`
    );

    // Determine the winner based on who is in checkmate
    let result: string;
    if (isCheckmate || (game.inCheck() && legalActions.length === 0)) {
      // The player whose turn it is to act (ban or move) is in checkmate
      const loser = game.turn;
      // Use standardized chess notation
      result = loser === "white" ? "0-1" : "1-0";
    } else if (isStalemate) {
      result = "1/2-1/2";
    } else {
      // This shouldn't happen, but handle it gracefully
      result = "1/2-1/2";
    }

    gameState.pgn = game.pgn(); // Store final PGN
    await handleGameEnd(gameId, result, gameState);
  }

  // Log game state including game over status
  if (gameState.gameOver) {
    console.log(
      `[broadcastGameState] Game ${gameId} is OVER: ${gameState.result}`
    );
  }
  console.log(`[broadcastGameState] FEN: ${fen}`);
  console.log(
    `[broadcastGameState] Ply: ${ply}, Active player: ${activePlayer}, Action type: ${actionType}, Legal actions count: ${legalActions.length}`
  );

  // Serialize legal actions using BanChess format
  const simpleLegalActions = legalActions
    .map((action) => BanChess.serializeAction(action))
    .filter((action): action is string => action !== null);

  // Check if the current player is in check
  const isInCheck = game.inCheck();

  const timeManager = timeManagers.get(gameId);

  // Get the last move from the game's history which includes SAN notation
  let lastMove: HistoryEntry | undefined = undefined;
  if (storedActions.length > 0) {
    // Get the full history from the game which includes SAN from ban-chess.ts 3.0.1
    const fullHistory = game.history();
    if (fullHistory.length > 0) {
      // Get the last entry which has the proper SAN notation
      const lastEntry = fullHistory[fullHistory.length - 1];
      lastMove = {
        ...lastEntry,
        turnNumber: Math.floor(lastEntry.ply / 4) + 1,
        bannedMove: lastEntry.bannedMove === null ? undefined : lastEntry.bannedMove,
      };
    }
  }

  const stateMsg = {
    type: "state",
    fen: fen,
    gameId,
    players: await getPlayerInfo(gameState),
    legalActions: simpleLegalActions,
    nextAction: actionType as "ban" | "move",
    activePlayer,
    ply,
    inCheck: isInCheck,
    // Send only the last move for incremental updates (frontend will append to history)
    lastMove,
    // Include action history for game reconstruction (in BCN format)
    actionHistory: storedActions,
    // Include sync state for quick game state loading
    syncState: {
      fen: game.fen(),
      lastAction:
        storedActions.length > 0
          ? storedActions[storedActions.length - 1]
          : undefined,
      moveNumber: Math.floor(ply / 4) + 1, // Each full move is 4 plies
    },
    messageId: `state-${++messageIdCounter}`,
    // Include game over state if the game is over (either by position or resignation/timeout)
    ...((isGameOver || gameState.gameOver) && {
      gameOver: true,
      result: gameState.result,
      resultReason: determineResultReason(game, gameState),
    }),
    ...(gameState.timeControl && {
      timeControl: gameState.timeControl,
      clocks: timeManager ? timeManager.getClocks() : gameState.finalClocks,
      startTime: gameState.startTime,
    }),
  } as SimpleServerMsg & { messageId: string };

  // Create a content hash WITHOUT the messageId for deduplication
  const contentForHash = { ...stateMsg };
  delete (contentForHash as { messageId?: string }).messageId;
  const stateHash = JSON.stringify(contentForHash);

  if (lastBroadcastStates.get(gameId) === stateHash) {
    console.log(
      `[broadcastGameState] Skipping duplicate state content for game ${gameId}`
    );
    return;
  }
  lastBroadcastStates.set(gameId, stateHash);

  // For single-server deployment, send directly to connected players
  // For multi-server deployment, we'd use Redis pub/sub instead
  // TODO: Make this configurable based on deployment mode

  // Direct send to connected players on this server (avoiding Redis pub/sub duplicates)
  const connectedPlayers = Array.from(authenticatedPlayers.values()).filter(
    (p) => {
      return (
        p.userId === gameState.whitePlayerId ||
        p.userId === gameState.blackPlayerId
      );
    }
  );

  connectedPlayers.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      if (!sentMessageIds.has(player.ws)) {
        sentMessageIds.set(player.ws, new Set());
      }

      // Use a state key that includes ply to allow new states but prevent duplicates
      const stateKey = `state-${gameId}-${ply}`;
      if (!sentMessageIds.get(player.ws)!.has(stateKey)) {
        sentMessageIds.get(player.ws)!.add(stateKey);
        player.ws.send(JSON.stringify(stateMsg));
        console.log(
          `[broadcastGameState] SENT state to ${player.username} for game ${gameId}, ply ${ply}, messageId: ${stateMsg.messageId}`
        );
      } else {
        console.log(
          `[broadcastGameState] SKIPPED duplicate state to ${player.username} for game ${gameId}, ply ${ply}`
        );
      }
    }
  });

  console.log(`[broadcastGameState] Broadcast complete for game ${gameId}`);
}

async function matchPlayers() {
  const players = await getPlayersForMatch();
  if (!players) return;

  const [player1, player2] = players;

  // Check if either player already has an active game (prevent double matching)
  const player1GameId = await redis.get(KEYS.PLAYER_GAME(player1.userId));
  const player2GameId = await redis.get(KEYS.PLAYER_GAME(player2.userId));

  if (player1GameId || player2GameId) {
    console.log(
      `[matchPlayers] Skipping match - players already in games. P1: ${player1GameId}, P2: ${player2GameId}`
    );
    // Put players back in queue if they were incorrectly removed
    if (!player1GameId) {
      await addToQueue(player1.userId, player1.username);
    }
    if (!player2GameId) {
      await addToQueue(player2.userId, player2.username);
    }
    return;
  }
  const gameId = uuidv4();
  const timeControl = { initial: 900, increment: 10 }; // Default 15+10 for matchmaking

  // Create new game
  const game = new BanChess();

  // Save game state to Redis
  await saveGameState(gameId, {
    fen: game.fen(),
    pgn: game.pgn(), // Initialize with empty PGN
    whitePlayerId: player1.userId,
    blackPlayerId: player2.userId,
    timeControl,
    startTime: Date.now(),
  });

  // Create time manager (local to this server for now)
  const timeManager = new TimeManager(
    timeControl,
    (winner) => handleTimeout(gameId, winner),
    () => broadcastClockUpdate(gameId)
  );
  // Use BanChess to determine who starts (should be Black at ply 1)
  const activePlayer = game.getActivePlayer();
  timeManager.start(activePlayer);
  timeManagers.set(gameId, timeManager);

  // Update player sessions
  await redis.set(KEYS.PLAYER_GAME(player1.userId), gameId);
  await redis.set(KEYS.PLAYER_GAME(player2.userId), gameId);

  // Send match notifications
  const player1Connected = Array.from(authenticatedPlayers.values()).find(
    (p) => p.userId === player1.userId
  );
  const player2Connected = Array.from(authenticatedPlayers.values()).find(
    (p) => p.userId === player2.userId
  );

  if (player1Connected && player1Connected.ws.readyState === WebSocket.OPEN) {
    player1Connected.ws.send(
      JSON.stringify({
        type: "matched",
        gameId,
        color: "white",
        opponent: player2.username,
        timeControl,
      } as SimpleServerMsg)
    );
  }

  if (player2Connected && player2Connected.ws.readyState === WebSocket.OPEN) {
    player2Connected.ws.send(
      JSON.stringify({
        type: "matched",
        gameId,
        color: "black",
        opponent: player1.username,
        timeControl,
      } as SimpleServerMsg)
    );
  }

  console.log(
    `Matched ${player1.username} vs ${player2.username} in game ${gameId} with time control ${timeControl.initial}+${timeControl.increment}`
  );

  // Update queue positions for remaining players
  await updateQueuePositions();
}

async function updateQueuePositions() {
  const queue = await redis.lrange(KEYS.QUEUE, 0, -1);

  for (let i = 0; i < queue.length; i++) {
    const data = JSON.parse(queue[i]);
    // Publish position update via Redis
    await redisPub.publish(
      KEYS.CHANNELS.QUEUE_UPDATE,
      JSON.stringify({
        userId: data.userId,
        position: i + 1,
      })
    );
  }
}

const lastPong = new Map<WebSocket, number>();
const lastPing = new Map<WebSocket, number>();

const PING_INTERVAL = 30 * 1000; // Send ping every 30 seconds
const INACTIVE_THRESHOLD = 10 * 1000; // Mark as inactive after 10 seconds
const DISCONNECT_TIMEOUT = 60 * 1000; // Disconnect only after 60 seconds of no response

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      const now = Date.now();
      const lastPongTime = lastPong.get(ws) || now;
      const timeSinceLastPong = now - lastPongTime;

      // Only disconnect if they haven't responded for a full minute
      if (timeSinceLastPong > DISCONNECT_TIMEOUT) {
        console.log(
          "Client timeout: No response for 60 seconds, disconnecting."
        );
        ws.terminate();
        lastPing.delete(ws);
        lastPong.delete(ws);
        return;
      }

      // Send a ping to check if they're still there
      ws.ping();
      lastPing.set(ws, now);

      // Update player status based on activity (but don't disconnect)
      const player = authenticatedPlayers.get(ws);
      if (player) {
        if (timeSinceLastPong > INACTIVE_THRESHOLD) {
          // Mark as inactive/away after 10 seconds (you could emit this status)
          // But DON'T disconnect them
        }
      }
    }
  });
}, PING_INTERVAL);

wss.on("connection", (ws: WebSocket, request) => {
  // Only log if debug mode is enabled
  // console.log('New client connected');
  // Initialize with current time so they don't get disconnected immediately
  lastPong.set(ws, Date.now());
  lastPing.set(ws, Date.now());

  ws.on("pong", () => {
    // Update last pong time when we receive a pong
    lastPong.set(ws, Date.now());
  });

  // Get auth info from the request that was validated during handshake
  const reqWithAuth = request as typeof request & {
    authToken?: {
      providerId: string;
      username: string;
      provider: string;
      userId: string;
      isGuest?: boolean;
    };
  };
  const authToken = reqWithAuth.authToken;
  let currentPlayer: Player | null = null;

  // Auto-authenticate if token present
  (async () => {
    if (authToken) {
      // Use userId from token (from database) instead of providerId
      const userId = authToken.userId || authToken.providerId;
      currentPlayer = {
        userId: userId,
        username: authToken.username,
        ws,
      };
      authenticatedPlayers.set(ws, currentPlayer);

      // Save player session to Redis
      await savePlayerSession(userId, {
        userId: userId,
        username: currentPlayer.username,
        status: "online",
        lastSeen: Date.now(),
      });

      console.log(
        `Player authenticated via ${
          authToken.isGuest ? "guest" : "session"
        } token: ${authToken.username}`
      );

      // Send authentication confirmation (only once)
      if (!currentPlayer.authMessageSent) {
        const authMsg = {
          type: "authenticated",
          userId: userId,
          username: authToken.username,
          messageId: `auth-${++messageIdCounter}`,
        } as SimpleServerMsg & { messageId: string };

        // Track this message as sent
        if (!sentMessageIds.has(ws)) {
          sentMessageIds.set(ws, new Set());
        }
        sentMessageIds.get(ws)!.add(authMsg.messageId);

        ws.send(JSON.stringify(authMsg));
        currentPlayer.authMessageSent = true;
        console.log(
          `[Auth] Sent authentication confirmation with ID: ${authMsg.messageId}`
        );
      }

      // Check if player was in a game (reconnection)
      const gameId = await redis.get(KEYS.PLAYER_GAME(userId));
      if (gameId) {
        const gameState = await getGameState(gameId);
        if (gameState) {
          // Subscribe to game channel
          await redisSub.subscribe(KEYS.CHANNELS.GAME_STATE(gameId));

          const color: "white" | "black" =
            gameState.whitePlayerId === userId ? "white" : "black";
          console.log(
            `${authToken.username} reconnected to game ${gameId} as ${color}`
          );
          // Restore time manager if needed
          await restoreTimeManager(gameId, gameState);
          // Send full state with history for reconnection
          await sendFullGameState(gameId, ws);
        }
      }
    }
  })();

  ws.on("message", async (data: Buffer) => {
    try {
      const messageStr = data.toString();

      // Handle plain text ping/pong messages from react-use-websocket
      if (messageStr === "ping") {
        ws.send("pong");
        return;
      }

      const msg: SimpleClientMsg = JSON.parse(messageStr);
      console.log("Received message:", msg.type);

      switch (msg.type) {
        case "ping": {
          // Respond to client heartbeat ping
          ws.send(JSON.stringify({ type: "pong" }));
          return; // Don't log ping/pong messages
        }

        case "authenticate": {
          const { userId, username } = msg;

          // Check if already authenticated (might happen with token auth)
          if (currentPlayer && currentPlayer.userId === userId) {
            console.log(
              `Player ${username} already authenticated, skipping duplicate`
            );
            // Don't send another auth message if we already sent one
            if (!currentPlayer.authMessageSent) {
              const authMsg = {
                type: "authenticated",
                userId,
                username,
                messageId: `auth-${++messageIdCounter}`,
              } as SimpleServerMsg & { messageId: string };

              if (!sentMessageIds.has(ws)) {
                sentMessageIds.set(ws, new Set());
              }
              sentMessageIds.get(ws)!.add(authMsg.messageId);

              ws.send(JSON.stringify(authMsg));
              currentPlayer.authMessageSent = true;
              console.log(
                `[Auth] Sent auth confirmation with ID: ${authMsg.messageId}`
              );
            }

            // Check if they're already in a game and send current state without re-joining
            const gameId = await redis.get(KEYS.PLAYER_GAME(userId));
            if (gameId) {
              const gameState = await getGameState(gameId);
              if (gameState) {
                await sendFullGameState(gameId, ws);
                const playerColor =
                  gameState.whitePlayerId === userId ? "white" : "black";
                console.log(
                  `[sendFullGameState] Sent full state with history for game ${gameId}`
                );
                console.log(
                  `${username} reconnected to game ${gameId} as ${playerColor}`
                );
              }
            }
            break;
          }

          // Handle duplicate connections gracefully
          const existingPlayer = Array.from(authenticatedPlayers.values()).find(
            (p) => p.userId === userId
          );
          if (existingPlayer && existingPlayer.ws !== ws) {
            console.log(
              `User ${username} establishing new connection, closing old one.`
            );
            existingPlayer.ws.close(1000, "New connection established");
            authenticatedPlayers.delete(existingPlayer.ws);
            await removeFromQueue(userId);
          }

          currentPlayer = { userId, username, ws };
          authenticatedPlayers.set(ws, currentPlayer);

          // Save player session to Redis
          await savePlayerSession(userId, {
            userId,
            username,
            status: "online",
            lastSeen: Date.now(),
          });

          console.log(`Player authenticated: ${username}`);

          // Send auth confirmation with message ID
          if (!currentPlayer.authMessageSent) {
            const authMsg = {
              type: "authenticated",
              userId,
              username,
              messageId: `auth-${++messageIdCounter}`,
            } as SimpleServerMsg & { messageId: string };

            if (!sentMessageIds.has(ws)) {
              sentMessageIds.set(ws, new Set());
            }
            sentMessageIds.get(ws)!.add(authMsg.messageId);

            ws.send(JSON.stringify(authMsg));
            currentPlayer.authMessageSent = true;
            console.log(
              `[Auth] Sent authentication confirmation with ID: ${authMsg.messageId}`
            );
          }

          // Check if player was in a game (reconnection)
          const gameId = await redis.get(KEYS.PLAYER_GAME(userId));
          if (gameId) {
            const gameState = await getGameState(gameId);
            if (gameState) {
              // Subscribe to game channel
              await redisSub.subscribe(KEYS.CHANNELS.GAME_STATE(gameId));

              let color: "white" | "black" =
                gameState.whitePlayerId === userId ? "white" : "black";

              // Note: color already correctly set based on game state

              ws.send(
                JSON.stringify({
                  type: "joined",
                  gameId,
                  color,
                  players: await getPlayerInfo(gameState),
                } as SimpleServerMsg)
              );

              // Restore time manager if needed
              await restoreTimeManager(gameId, gameState);
              // Send full state with history for reconnection
              await sendFullGameState(gameId, ws);
              console.log(
                `${username} reconnected to game ${gameId} as ${color}`
              );
            }
          }
          break;
        }

        case "create-solo-game": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const gameId = uuidv4();
          const timeControl = msg.timeControl || {
            initial: 900,
            increment: 10,
          };

          // Create new game
          const game = new BanChess();

          // Save game state to Redis
          await saveGameState(gameId, {
            fen: game.fen(),
            pgn: game.pgn(), // Initialize with empty PGN
            whitePlayerId: currentPlayer.userId,
            blackPlayerId: currentPlayer.userId,
            timeControl,
            startTime: Date.now(),
          });

          // Create time manager
          if (timeControl) {
            const timeManager = new TimeManager(
              timeControl,
              (winner) => handleTimeout(gameId, winner),
              () => broadcastClockUpdate(gameId)
            );
            // Use BanChess to determine who starts (should be Black at ply 1)
            const activePlayer = game.getActivePlayer();
            timeManager.start(activePlayer);
            timeManagers.set(gameId, timeManager);
          }

          // Update player's current game
          await redis.set(KEYS.PLAYER_GAME(currentPlayer.userId), gameId);

          // Subscribe to game channel
          await redisSub.subscribe(KEYS.CHANNELS.GAME_STATE(gameId));

          const gameCreatedMsg = {
            type: "game-created",
            gameId,
            timeControl,
            messageId: `game-created-${++messageIdCounter}`,
          } as SimpleServerMsg & { messageId: string };

          if (!sentMessageIds.has(ws)) {
            sentMessageIds.set(ws, new Set());
          }

          // Check if we've already sent this type of message for this game
          const msgKey = `game-created-${gameId}`;
          if (!sentMessageIds.get(ws)!.has(msgKey)) {
            sentMessageIds.get(ws)!.add(msgKey);
            ws.send(JSON.stringify(gameCreatedMsg));
            console.log(
              `[Game] Sent game-created with ID: ${gameCreatedMsg.messageId}`
            );
          } else {
            console.log(
              `[Game] Skipping duplicate game-created for game ${gameId}`
            );
          }
          console.log(
            `Solo game ${gameId} created for ${currentPlayer.username} with time control ${timeControl.initial}+${timeControl.increment}`
          );
          break;
        }

        case "join-game": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const { gameId } = msg;
          // Check both Redis and database for the game
          const gameSource = await getGameSource(gameId);

          if (!gameSource) {
            console.log(
              `[join-game] Game ${gameId} not found in Redis or database`
            );
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Game not found",
              } as SimpleServerMsg)
            );
            return;
          }

          // Reconstruct the game to check if it's over
          const game = reconstructGameFromBCN(gameSource.bcn);
          const isGameOver = game.gameOver() || !!gameSource.result;

          console.log(
            `[join-game] Game ${gameId}: storage=${gameSource.type}, gameOver=${isGameOver}`
          );

          // For games that are over (regardless of where they're stored), just send the state
          // For active games still in progress, handle subscriptions and associations
          if (isGameOver) {
            // Game is over - just send the state for viewing
            // No need to set up subscriptions or player associations
            ws.send(
              JSON.stringify({
                type: "joined",
                gameId,
              } as SimpleServerMsg)
            );

            await sendFullGameState(gameId, ws);
            console.log(
              `Player ${currentPlayer.username} viewing completed game ${gameId}`
            );
          } else {
            // Game is still active - set up proper associations and subscriptions

            // Check if player was already in this game before setting the new association
            const previousGameId = await redis.get(
              KEYS.PLAYER_GAME(currentPlayer.userId)
            );

            // Now set the new association and subscribe
            await redis.set(KEYS.PLAYER_GAME(currentPlayer.userId), gameId);
            await redisSub.subscribe(KEYS.CHANNELS.GAME_STATE(gameId));

            ws.send(
              JSON.stringify({
                type: "joined",
                gameId,
              } as SimpleServerMsg)
            );

            // Always send the full game state when joining an active game
            // This ensures players get the current state regardless of reconnection scenario
            await sendFullGameState(gameId, ws);
            console.log(
              `Player ${
                currentPlayer.username
              } joined active game ${gameId} (previous game: ${
                previousGameId || "none"
              })`
            );
          }
          break;
        }

        case "action": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const { gameId, action } = msg;
          const gameState = await getGameState(gameId);

          if (!gameState) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Game not found",
              } as SimpleServerMsg)
            );
            return;
          }

          // NEW CHECK: Ensure the player is part of the game
          if (
            currentPlayer.userId !== gameState.whitePlayerId &&
            currentPlayer.userId !== gameState.blackPlayerId
          ) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "You are a spectator and cannot make moves.",
              } as SimpleServerMsg)
            );
            return;
          }

          // CRITICAL CHECK: Verify it's the player's turn
          const game = new BanChess(gameState.fen);
          const activePlayer = game.getActivePlayer();
          const playerColor = currentPlayer.userId === gameState.whitePlayerId ? "white" : "black";
          
          if (activePlayer !== playerColor) {
            console.log(
              `[WebSocket] Player ${currentPlayer.username} tried to move out of turn. Active: ${activePlayer}, Player: ${playerColor}`
            );
            ws.send(
              JSON.stringify({
                type: "error",
                message: `It's not your turn. Waiting for ${activePlayer} to play.`,
              } as SimpleServerMsg)
            );
            return;
          }

          console.log(`Action in game ${gameId} by ${playerColor}:`, action);

          // Deserialize the action string to Action object
          const deserializedAction = BanChess.deserializeAction(action);

          // Use GameService to apply the action (handles validation, history, and move times)
          const result = await GameService.applyAction(
            gameId,
            deserializedAction
          );

          if (result.success) {
            // Handle clock switching after successful move/ban
            const timeManager = timeManagers.get(gameId);
            if (timeManager && !result.gameOver) {
              // Get the updated game state to determine next player
              const updatedGameState = await getGameState(gameId);
              if (updatedGameState) {
                const game = new BanChess(updatedGameState.fen);
                const nextPlayer = game.getActivePlayer();
                timeManager.switchPlayer(nextPlayer);
              }
            }

            await broadcastGameState(gameId);

            // Note: Timer cleanup and persistence is handled by GameService.applyAction -> handleGameEnd
            // when game.gameOver() is detected
          } else {
            console.log(
              `Invalid action in game ${gameId}:`,
              action,
              "Error:",
              result.error
            );
            ws.send(
              JSON.stringify({
                type: "error",
                message: result.error || "Invalid action",
              } as SimpleServerMsg)
            );
          }
          break;
        }

        case "join-queue": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const position = await addToQueue(
            currentPlayer.userId,
            currentPlayer.username
          );
          console.log(
            `${currentPlayer.username} joined queue (position ${position})`
          );

          // Update player session status
          await savePlayerSession(currentPlayer.userId, {
            userId: currentPlayer.userId,
            username: currentPlayer.username,
            status: "queued",
            lastSeen: Date.now(),
          });

          // Try to match players
          await matchPlayers();

          // Update queue positions
          await updateQueuePositions();
          break;
        }

        case "leave-queue": {
          if (currentPlayer) {
            await removeFromQueue(currentPlayer.userId);
            console.log(`${currentPlayer.username} left queue`);

            // Update player session status
            await savePlayerSession(currentPlayer.userId, {
              userId: currentPlayer.userId,
              username: currentPlayer.username,
              status: "online",
              lastSeen: Date.now(),
            });

            await updateQueuePositions();
          }
          break;
        }

        case "give-time": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const { gameId, amount } = msg;
          const gameState = await getGameState(gameId);

          if (!gameState) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Game not found",
              } as SimpleServerMsg)
            );
            return;
          }

          // Disable give-time if player is playing against themselves
          if (gameState.whitePlayerId === gameState.blackPlayerId) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Cannot give time when playing both sides",
              } as SimpleServerMsg)
            );
            return;
          }

          // Security validation: Check if the player is actually in this game
          const isWhitePlayer =
            currentPlayer.userId === gameState.whitePlayerId;
          const isBlackPlayer =
            currentPlayer.userId === gameState.blackPlayerId;

          if (!isWhitePlayer && !isBlackPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "You are not a player in this game",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if game is still active
          if (gameState.gameOver) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Game has already ended",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if time control is enabled
          if (!gameState.timeControl) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "This game has no time control",
              } as SimpleServerMsg)
            );
            return;
          }

          // Determine the recipient (always the opponent)
          const giverColor: "white" | "black" = isWhitePlayer
            ? "white"
            : "black";
          const recipientColor: "white" | "black" =
            giverColor === "white" ? "black" : "white";

          // Get time manager and add time
          const timeManager = timeManagers.get(gameId);
          if (timeManager) {
            // Give 15 seconds by default
            const timeToGive = amount || 15;
            timeManager.giveTime(recipientColor, timeToGive);

            // Create game event
            const event: GameEvent = {
              timestamp: Date.now(),
              type: "time-given",
              message: `${giverColor} gave ${timeToGive} seconds to ${recipientColor}`,
              player: giverColor,
              metadata: {
                amount: timeToGive,
                recipient: recipientColor,
              },
            };

            // Store event in Redis
            await addGameEvent(gameId, event);

            // Broadcast the event to all clients watching this game
            authenticatedPlayers.forEach((player) => {
              // Check if this player is in the game
              if (
                (player.userId === gameState.whitePlayerId ||
                  player.userId === gameState.blackPlayerId) &&
                player.ws.readyState === WebSocket.OPEN
              ) {
                player.ws.send(
                  JSON.stringify({
                    type: "game-event",
                    gameId,
                    event,
                  } as SimpleServerMsg)
                );
              }
            });

            // Also send clock update
            broadcastClockUpdate(gameId);

            console.log(
              `[give-time] ${giverColor} gave ${timeToGive} seconds to ${recipientColor} in game ${gameId}`
            );
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Time manager not found for this game",
              } as SimpleServerMsg)
            );
          }
          break;
        }

        case "resign": {
          const resignStart = Date.now();
          console.log(
            `[resign] Starting resignation process for game ${msg.gameId}`
          );

          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const { gameId } = msg;
          const gameState = await getGameState(gameId);
          console.log(
            `[resign] Got game state in ${Date.now() - resignStart}ms`
          );

          if (!gameState) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Game not found",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if the player is actually in this game
          const isWhite = currentPlayer.userId === gameState.whitePlayerId;
          const isBlack = currentPlayer.userId === gameState.blackPlayerId;

          if (!isWhite && !isBlack) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "You are not in this game",
              } as SimpleServerMsg)
            );
            return;
          }

          // Determine the winner (opposite of the resigning player)
          const winner = isWhite ? "black" : "white";
          const loser = isWhite ? "white" : "black";

          console.log(
            `[resign] Handling game end at ${Date.now() - resignStart}ms`
          );

          // Mark that this game ended due to resignation
          gameState.resigned = true;
          gameState.resignedPlayer = loser;
          
          // Use standardized chess notation for result
          const standardResult = winner === "white" ? "1-0" : "0-1";
          
          // Handle resignation
          await handleGameEnd(
            gameId,
            standardResult,
            gameState
          );

          console.log(
            `[resign] Game end handled at ${Date.now() - resignStart}ms`
          );

          // Create and store resignation event
          const event: GameEvent = {
            type: "resignation",
            timestamp: Date.now(),
            message: `${loser === "white" ? "White" : "Black"} resigned`,
            player: loser,
          };
          await addGameEvent(gameId, event);

          console.log(`[resign] Event added at ${Date.now() - resignStart}ms`);

          // Broadcast game over state
          console.log(`[resign] Broadcasting resignation for game ${gameId}`);
          await broadcastGameState(gameId);

          console.log(
            `[resign] ${
              currentPlayer.username
            } (${loser}) resigned in game ${gameId} - Total time: ${
              Date.now() - resignStart
            }ms`
          );

          // Note: We don't clean up Redis data anymore - it's persisted to database
          break;
        }

        case "offer-draw": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const { gameId } = msg;
          const gameState = await getGameState(gameId);

          if (!gameState || gameState.gameOver) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: gameState ? "Game already ended" : "Game not found",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if the player is in this game
          const playerColor = currentPlayer.userId === gameState.whitePlayerId ? "white" :
                            currentPlayer.userId === gameState.blackPlayerId ? "black" : null;

          if (!playerColor) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "You are not in this game",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if there's already a draw offer from the opponent
          if (gameState.drawOfferedBy && gameState.drawOfferedBy !== playerColor) {
            // Auto-accept if opponent already offered
            gameState.gameOver = true;
            gameState.result = "1/2-1/2";
            gameState.drawOfferedBy = null;
            await saveGameState(gameId, gameState);
            
            await handleGameEnd(gameId, "1/2-1/2", gameState);
            await broadcastGameState(gameId);
            
            // Broadcast draw accepted to all players in the game
            const connectedPlayers = Array.from(authenticatedPlayers.values()).filter(
              (p) => p.userId === gameState.whitePlayerId || p.userId === gameState.blackPlayerId
            );
            
            connectedPlayers.forEach((player) => {
              if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(
                  JSON.stringify({
                    type: "draw-accepted",
                    gameId,
                  } as SimpleServerMsg)
                );
              }
            });
            
            console.log(`[draw] Draw agreed by mutual offer in game ${gameId}`);
          } else {
            // Store the draw offer
            gameState.drawOfferedBy = playerColor;
            await saveGameState(gameId, gameState);
            
            // Broadcast draw offer to all players in the game
            const connectedPlayers = Array.from(authenticatedPlayers.values()).filter(
              (p) => p.userId === gameState.whitePlayerId || p.userId === gameState.blackPlayerId
            );
            
            connectedPlayers.forEach((player) => {
              if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(
                  JSON.stringify({
                    type: "draw-offered",
                    gameId,
                    offeredBy: playerColor,
                  } as SimpleServerMsg)
                );
              }
            });
            
            console.log(`[draw] ${playerColor} offered draw in game ${gameId}`);
          }
          break;
        }

        case "accept-draw": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const { gameId } = msg;
          const gameState = await getGameState(gameId);

          if (!gameState || gameState.gameOver) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: gameState ? "Game already ended" : "Game not found",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if the player is in this game
          const playerColor = currentPlayer.userId === gameState.whitePlayerId ? "white" :
                            currentPlayer.userId === gameState.blackPlayerId ? "black" : null;

          if (!playerColor) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "You are not in this game",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if there's a draw offer to accept
          if (!gameState.drawOfferedBy || gameState.drawOfferedBy === playerColor) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "No draw offer to accept",
              } as SimpleServerMsg)
            );
            return;
          }

          // Accept the draw
          gameState.gameOver = true;
          gameState.result = "1/2-1/2";
          gameState.drawOfferedBy = null;
          await saveGameState(gameId, gameState);
          
          await handleGameEnd(gameId, "1/2-1/2", gameState);
          await broadcastGameState(gameId);
          
          // Broadcast draw accepted to all players in the game
          const connectedPlayers = Array.from(authenticatedPlayers.values()).filter(
            (p) => p.userId === gameState.whitePlayerId || p.userId === gameState.blackPlayerId
          );
          
          connectedPlayers.forEach((player) => {
            if (player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(
                JSON.stringify({
                  type: "draw-accepted",
                  gameId,
                } as SimpleServerMsg)
              );
            }
          });
          
          console.log(`[draw] Draw accepted by ${playerColor} in game ${gameId}`);
          break;
        }

        case "decline-draw": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg)
            );
            return;
          }

          const { gameId } = msg;
          const gameState = await getGameState(gameId);

          if (!gameState || gameState.gameOver) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: gameState ? "Game already ended" : "Game not found",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if the player is in this game
          const playerColor = currentPlayer.userId === gameState.whitePlayerId ? "white" :
                            currentPlayer.userId === gameState.blackPlayerId ? "black" : null;

          if (!playerColor) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "You are not in this game",
              } as SimpleServerMsg)
            );
            return;
          }

          // Check if there's a draw offer to decline
          if (!gameState.drawOfferedBy || gameState.drawOfferedBy === playerColor) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "No draw offer to decline",
              } as SimpleServerMsg)
            );
            return;
          }

          // Clear the draw offer
          gameState.drawOfferedBy = null;
          await saveGameState(gameId, gameState);
          
          // Broadcast draw declined to all players in the game
          const connectedPlayers = Array.from(authenticatedPlayers.values()).filter(
            (p) => p.userId === gameState.whitePlayerId || p.userId === gameState.blackPlayerId
          );
          
          connectedPlayers.forEach((player) => {
            if (player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(
                JSON.stringify({
                  type: "draw-declined",
                  gameId,
                  declinedBy: playerColor,
                } as SimpleServerMsg)
              );
            }
          });
          
          console.log(`[draw] Draw declined by ${playerColor} in game ${gameId}`);
          break;
        }
      }
    } catch (err) {
      console.error("Error handling message:", err);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Server error",
        } as SimpleServerMsg)
      );
    }
  });

  ws.on("close", async () => {
    // Only log if debug mode is enabled
    // console.log('Client disconnected');
    if (currentPlayer) {
      authenticatedPlayers.delete(ws);
      await removeFromQueue(currentPlayer.userId);
      await removePlayerSession(currentPlayer.userId);

      const gameId = await redis.get(KEYS.PLAYER_GAME(currentPlayer.userId));
      if (gameId) {
        console.log(
          `Player ${currentPlayer.username} disconnected from game ${gameId}`
        );
        // Note: We don't remove the game or player from game, allowing reconnection
      }
    }
    // Clean up tracking
    lastPong.delete(ws);
    lastPing.delete(ws);
    sentMessageIds.delete(ws); // Clean up message tracking
  });
});

// Track if we're already shutting down to prevent multiple shutdowns
let isShuttingDown = false;

// Graceful shutdown with timeout
const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    console.log(`[WebSocket] Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  console.log(`\n[WebSocket] Received ${signal}, shutting down gracefully...`);

  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error(
      "[WebSocket] Graceful shutdown timeout exceeded, forcing exit..."
    );
    process.exit(1);
  }, 10000); // 10 second timeout

  try {
    // Close all WebSocket connections
    console.log("[WebSocket] Closing WebSocket connections...");
    const closePromises = Array.from(wss.clients).map((ws) => {
      return new Promise<void>((resolve) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, "Server shutting down");
          ws.on("close", () => resolve());
          // Timeout for individual connection close
          setTimeout(() => resolve(), 1000);
        } else {
          resolve();
        }
      });
    });

    await Promise.all(closePromises);
    console.log("[WebSocket] All connections closed");

    // Destroy all time managers
    console.log("[WebSocket] Destroying time managers...");
    timeManagers.forEach((tm) => tm.destroy());
    timeManagers.clear();

    // Close WebSocket server
    await new Promise<void>((resolve) => {
      wss.close(() => {
        console.log("[WebSocket] Server closed");
        resolve();
      });
      // Timeout for server close
      setTimeout(() => resolve(), 2000);
    });

    // Shutdown Redis connections
    console.log("[WebSocket] Shutting down Redis...");
    await redisShutdown();

    clearTimeout(forceExitTimeout);
    console.log("[WebSocket] Graceful shutdown complete");
    process.exit(0);
  } catch (err) {
    console.error("[WebSocket] Error during shutdown:", err);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGHUP", () => shutdown("SIGHUP"));

// Prevent unhandled promise rejections from crashing the server
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[WebSocket] Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
});

// Prevent uncaught exceptions from crashing the server without cleanup
process.on("uncaughtException", (error) => {
  console.error("[WebSocket] Uncaught Exception:", error);
  shutdown("UNCAUGHT_EXCEPTION");
});
