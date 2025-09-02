import { WebSocketServer, WebSocket } from "ws";
import { BanChess } from "ban-chess.ts";
import type {
  SimpleServerMsg,
  SimpleClientMsg,
  HistoryEntry,
  TimeControl,
  GameEvent,
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
  addActionToHistory,
  getActionHistory,
  addGameEvent,
  getRecentGameEvents,
} from "./redis";

interface Player {
  userId: string;
  username: string;
  ws: WebSocket;
}

// In-memory cache for active connections and time managers
// These don't need Redis as they're connection-specific
const authenticatedPlayers = new Map<WebSocket, Player>();
const timeManagers = new Map<string, TimeManager>();

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
          `[WebSocket] Blocked connection from unauthorized origin: ${origin}`,
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
      cb(true);
    } else {
      cb(false, 401, "Unauthorized");
    }
  },
});

console.log(`[WebSocket] Server started on port 3001`);
console.log(
  `[WebSocket] Environment: ${process.env.NODE_ENV || "development"}`,
);
console.log(`[WebSocket] Allowed origins: ${allowedOrigins.join(", ")}`);
console.log(
  `[WebSocket] Redis URL: ${process.env.REDIS_URL || "redis://localhost:6379"}`,
);
console.log(
  `[WebSocket] NEXT_PUBLIC_WEBSOCKET_URL: ${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`,
);

// Subscribe to Redis pub/sub channels for cross-server communication
async function setupRedisPubSub() {
  // Subscribe to queue updates
  await redisSub.subscribe(KEYS.CHANNELS.QUEUE_UPDATE);

  redisSub.on("message", async (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (channel === KEYS.CHANNELS.QUEUE_UPDATE) {
        // Notify players in queue about position updates
        const { userId, position } = data;
        const player = Array.from(authenticatedPlayers.values()).find(
          (p) => p.userId === userId,
        );
        if (player && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(
            JSON.stringify({
              type: "queued",
              position,
            } as SimpleServerMsg),
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
        err,
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
    },
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
      KEYS.PLAYER_SESSION(gameState.whitePlayerId),
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
      KEYS.PLAYER_SESSION(gameState.blackPlayerId),
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

async function handleTimeout(gameId: string, winner: "white" | "black") {
  const gameState = await getGameState(gameId);
  if (!gameState) return;

  console.log(
    `[handleTimeout] Player ${winner === "white" ? "black" : "white"} ran out of time in game ${gameId}`,
  );

  // Stop the time manager
  const timeManager = timeManagers.get(gameId);
  if (timeManager) {
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
  gameState.gameOver = true;
  gameState.result = `${winner === "white" ? "White" : "Black"} wins on time!`;
  gameState.pgn = game.pgn(); // Store final PGN
  await saveGameState(gameId, gameState);

  // Send timeout message via pub/sub for all servers
  const timeoutMsg: SimpleServerMsg = {
    type: "timeout",
    gameId,
    winner,
  };

  await redisPub.publish(
    KEYS.CHANNELS.GAME_STATE(gameId),
    JSON.stringify(timeoutMsg),
  );

  // Also send state update
  const stateMsg: SimpleServerMsg = {
    type: "state",
    fen: gameState.fen,
    gameId,
    players: await getPlayerInfo(gameState),
    gameOver: true,
    result: gameState.result,
    history: game.history() as HistoryEntry[],
    timeControl: gameState.timeControl,
    clocks: timeManager ? timeManager.getClocks() : undefined,
  };

  await redisPub.publish(
    KEYS.CHANNELS.GAME_STATE(gameId),
    JSON.stringify(stateMsg),
  );
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
    JSON.stringify(clockMsg),
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
  },
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
      `[restoreTimeManager] Not restoring timer for game ${gameId}: gameOver=${gameState.gameOver}, result=${gameState.result}, hasTimeManager=${timeManagers.has(gameId)}`,
    );
    return;
  }

  // Create new time manager
  const timeManager = new TimeManager(
    gameState.timeControl,
    (winner) => handleTimeout(gameId, winner),
    () => broadcastClockUpdate(gameId),
  );

  // TODO: In production you'd need to track actual time spent per player
  // For now, we just restart the timer for the current player

  // Determine current player based on FEN
  const game = new BanChess(gameState.fen);
  const fen = game.fen();
  const fenParts = fen.split(" ");
  const chessTurn = fenParts[1] === "w" ? "white" : "black";
  const banState = fenParts[6];
  const isNextActionBan = banState && banState.includes(":ban");

  // For ban phase, the banning player is the opposite of current turn
  // For move phase, it's the current turn player
  const currentPlayer: "white" | "black" = isNextActionBan
    ? chessTurn === "white"
      ? "black"
      : "white"
    : chessTurn;

  // Start the timer for the current player
  timeManager.start(currentPlayer);
  timeManagers.set(gameId, timeManager);

  console.log(
    `[restoreTimeManager] Restored timer for game ${gameId}, current player: ${currentPlayer}`,
  );
}

// Send full game state with history - used for new joiners/reconnections
async function sendFullGameState(gameId: string, ws: WebSocket) {
  const gameState = await getGameState(gameId);
  if (!gameState) {
    console.log(`[sendFullGameState] Game ${gameId} not found in Redis`);
    return;
  }

  // Create game instance from FEN
  const game = new BanChess(gameState.fen);

  // Check for immediate checkmate when sending state
  const isGameOver = checkForImmediateCheckmate(game);
  const isCheckmate =
    game.inCheckmate() || (game.inCheck() && game.legalMoves().length === 0);
  const isStalemate = game.inStalemate();

  if (isGameOver && !gameState.gameOver) {
    // Game just ended due to immediate checkmate detection
    let result: string;
    if (isCheckmate || (game.inCheck() && game.legalMoves().length === 0)) {
      const loser = game.turn;
      result = `${loser === "white" ? "Black" : "White"} wins by checkmate!`;
    } else if (isStalemate) {
      result = "Draw by stalemate";
    } else {
      result = "Game over";
    }

    gameState.gameOver = true;
    gameState.result = result;
    await saveGameState(gameId, gameState);
  }

  // Get legal moves/bans from the game
  const fen = game.fen();
  const fenParts = fen.split(" ");
  const banState = fenParts[6];
  const isNextActionBan = banState && banState.includes(":ban");

  const legalActions = isNextActionBan ? game.legalBans() : game.legalMoves();
  const simpleLegalActions = legalActions
    .map((action: string | { from: string; to: string }) => {
      if (typeof action === "string") {
        return action;
      } else if (
        action &&
        typeof action === "object" &&
        "from" in action &&
        "to" in action
      ) {
        return action.from + action.to;
      }
      return null;
    })
    .filter((action): action is string => action !== null);

  const timeManager = timeManagers.get(gameId);
  const isInCheck = game.inCheck();

  // Retrieve full action history from Redis and reconstruct game
  const actionHistory = await getActionHistory(gameId);

  // Reconstruct the full game to get proper history
  let history: HistoryEntry[] = [];
  if (actionHistory.length > 0) {
    const reconstructedGame = BanChess.replayFromActions(actionHistory);
    // Convert ban-chess.ts HistoryEntry to our HistoryEntry type
    history = reconstructedGame.history().map((entry) => ({
      ...entry,
      bannedMove: entry.bannedMove === null ? undefined : entry.bannedMove,
    }));
  }

  // Get recent game events
  const recentEvents = await getRecentGameEvents(gameId, 10);

  // Full state WITH history for new joiners
  const fullStateMsg: SimpleServerMsg = {
    type: "state",
    fen: fen,
    gameId,
    players: await getPlayerInfo(gameState),
    legalActions: simpleLegalActions,
    nextAction: isNextActionBan ? "ban" : "move",
    inCheck: isInCheck,
    history, // Include full history from Redis for new joiners
    events: recentEvents, // Include recent events
    ...(gameState.gameOver && {
      gameOver: true,
      result: gameState.result,
    }),
    ...(gameState.timeControl && {
      timeControl: gameState.timeControl,
      clocks: timeManager ? timeManager.getClocks() : undefined,
      startTime: gameState.startTime,
    }),
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(fullStateMsg));
    console.log(
      `[sendFullGameState] Sent full state with history for game ${gameId}`,
    );
  }
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
  const isNextActionBan = banState && banState.includes(":ban");

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

  // Create game instance from FEN
  const game = new BanChess(gameState.fen);

  // Check for both immediate checkmate and standard game over conditions
  const isGameOver = checkForImmediateCheckmate(game);
  const isCheckmate =
    game.inCheckmate() || (game.inCheck() && game.legalMoves().length === 0);
  const isStalemate = game.inStalemate();

  if (isGameOver) {
    console.log(
      `[broadcastGameState] GAME OVER in ${gameId}! Checkmate: ${isCheckmate}, Stalemate: ${isStalemate}`,
    );

    // Determine the winner based on who is in checkmate
    let result: string;
    if (isCheckmate || (game.inCheck() && game.legalMoves().length === 0)) {
      // The player whose turn it is to act (ban or move) is in checkmate
      const loser = game.turn;
      result = `${loser === "white" ? "Black" : "White"} wins by checkmate!`;
    } else if (isStalemate) {
      result = "Draw by stalemate";
    } else {
      result = "Game over";
    }

    gameState.gameOver = true;
    gameState.result = result;
    gameState.pgn = game.pgn(); // Store final PGN
    await saveGameState(gameId, gameState);
  }

  // Get legal moves/bans from the game
  const fen = game.fen();
  const fenParts = fen.split(" ");
  const chessTurn = fenParts[1] === "w" ? "white" : "black";
  const banState = fenParts[6]; // 7th field contains ban state
  const isNextActionBan = banState && banState.includes(":ban");

  // Get legal actions and convert to simple format
  const legalActions = isNextActionBan ? game.legalBans() : game.legalMoves();
  console.log(`[broadcastGameState] FEN: ${fen}`);
  console.log(
    `[broadcastGameState] Chess turn: ${chessTurn}, Next action: ${isNextActionBan ? "ban" : "move"}, Legal actions count: ${legalActions.length}`,
  );

  const simpleLegalActions = legalActions
    .map((action: string | { from: string; to: string }) => {
      if (typeof action === "string") {
        return action;
      } else if (
        action &&
        typeof action === "object" &&
        "from" in action &&
        "to" in action
      ) {
        return action.from + action.to;
      }
      return null;
    })
    .filter((action): action is string => action !== null);

  // Determine the acting player
  // For ban phase, the banning player is the opposite of current turn
  // For move phase, it's the current turn player
  const actingPlayer: "white" | "black" = isNextActionBan
    ? chessTurn === "white"
      ? "black"
      : "white"
    : chessTurn;

  console.log(`[broadcastGameState] Acting player: ${actingPlayer}`);

  // Check if the current player is in check
  const isInCheck = game.inCheck();

  const timeManager = timeManagers.get(gameId);

  // Get the last action from Redis for incremental updates
  const storedActions = await getActionHistory(gameId);

  // Reconstruct the last move from action history
  let lastMove: HistoryEntry | undefined = undefined;
  if (storedActions.length > 0) {
    // We could reconstruct the full game to get the last move with proper notation
    // But for efficiency, we'll just send the last action for now
    const lastActionSerialized = storedActions[storedActions.length - 1];
    // Deserialize the action to get the proper type
    const deserializedAction = BanChess.deserializeAction(lastActionSerialized);
    const actionObj =
      "ban" in deserializedAction
        ? deserializedAction.ban
        : deserializedAction.move;

    lastMove = {
      fen: game.fen(),
      turnNumber: Math.floor(storedActions.length / 2) + 1,
      player: storedActions.length % 2 === 0 ? "black" : "white",
      actionType: lastActionSerialized.startsWith("b:") ? "ban" : "move",
      action: actionObj,
      // Optional fields from ban-chess.ts HistoryEntry
      san: undefined,
      bannedMove: undefined,
    };
  }

  const stateMsg: SimpleServerMsg = {
    type: "state",
    fen: fen,
    gameId,
    players: await getPlayerInfo(gameState),
    legalActions: simpleLegalActions,
    nextAction: isNextActionBan ? "ban" : "move",
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
      moveNumber: Math.floor(storedActions.length / 2) + 1,
    },
    ...(isGameOver && {
      gameOver: true,
      result: gameState.result,
    }),
    ...(gameState.timeControl && {
      timeControl: gameState.timeControl,
      clocks: timeManager ? timeManager.getClocks() : undefined,
      startTime: gameState.startTime,
    }),
  };

  // Publish to Redis for all servers
  await redisPub.publish(
    KEYS.CHANNELS.GAME_STATE(gameId),
    JSON.stringify(stateMsg),
  );

  // Also directly send to connected players on this server
  const connectedPlayers = Array.from(authenticatedPlayers.values()).filter(
    (p) => {
      return (
        p.userId === gameState.whitePlayerId ||
        p.userId === gameState.blackPlayerId
      );
    },
  );

  connectedPlayers.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      const msgToSend = stateMsg;

      player.ws.send(JSON.stringify(msgToSend));
      console.log(
        `[broadcastGameState] SENT state to ${player.username} for game ${gameId}`,
      );
    }
  });

  console.log(`[broadcastGameState] Broadcast complete for game ${gameId}`);
}

async function matchPlayers() {
  const players = await getPlayersForMatch();
  if (!players) return;

  const [player1, player2] = players;
  const gameId = uuidv4();
  const timeControl = { initial: 300, increment: 0 }; // Default 5+0 for matchmaking

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
    () => broadcastClockUpdate(gameId),
  );
  timeManager.start("white");
  timeManagers.set(gameId, timeManager);

  // Update player sessions
  await redis.set(KEYS.PLAYER_GAME(player1.userId), gameId);
  await redis.set(KEYS.PLAYER_GAME(player2.userId), gameId);

  // Send match notifications
  const player1Connected = Array.from(authenticatedPlayers.values()).find(
    (p) => p.userId === player1.userId,
  );
  const player2Connected = Array.from(authenticatedPlayers.values()).find(
    (p) => p.userId === player2.userId,
  );

  if (player1Connected && player1Connected.ws.readyState === WebSocket.OPEN) {
    player1Connected.ws.send(
      JSON.stringify({
        type: "matched",
        gameId,
        color: "white",
        opponent: player2.username,
        timeControl,
      } as SimpleServerMsg),
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
      } as SimpleServerMsg),
    );
  }

  console.log(
    `Matched ${player1.username} vs ${player2.username} in game ${gameId} with time control ${timeControl.initial}+${timeControl.increment}`,
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
      }),
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
          "Client timeout: No response for 60 seconds, disconnecting.",
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
    authToken?: { providerId: string; username: string; provider: string };
  };
  const authToken = reqWithAuth.authToken;
  let currentPlayer: Player | null = null;

  // Auto-authenticate if token present
  (async () => {
    if (authToken) {
      currentPlayer = {
        userId: authToken.providerId,
        username: authToken.username,
        ws,
      };
      authenticatedPlayers.set(ws, currentPlayer);

      // Save player session to Redis
      await savePlayerSession(currentPlayer.userId, {
        userId: currentPlayer.userId,
        username: currentPlayer.username,
        status: "online",
        lastSeen: Date.now(),
      });

      console.log(`Player authenticated via token: ${authToken.username}`);

      // Send authentication confirmation
      ws.send(
        JSON.stringify({
          type: "authenticated",
          userId: authToken.providerId,
          username: authToken.username,
        } as SimpleServerMsg),
      );

      // Check if player was in a game (reconnection)
      const gameId = await redis.get(KEYS.PLAYER_GAME(authToken.providerId));
      if (gameId) {
        const gameState = await getGameState(gameId);
        if (gameState) {
          // Subscribe to game channel
          await redisSub.subscribe(KEYS.CHANNELS.GAME_STATE(gameId));

          const color: "white" | "black" =
            gameState.whitePlayerId === authToken.providerId
              ? "white"
              : "black";
          console.log(
            `${authToken.username} reconnected to game ${gameId} as ${color}`,
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
              `Player ${username} already authenticated, skipping duplicate`,
            );
            ws.send(
              JSON.stringify({
                type: "authenticated",
                userId,
                username,
              } as SimpleServerMsg),
            );

            // Check if they're already in a game and send current state without re-joining
            const gameId = await redis.get(KEYS.PLAYER_GAME(userId));
            if (gameId) {
              const gameState = await getGameState(gameId);
              if (gameState) {
                await sendFullGameState(gameId, ws);
                console.log(
                  `[sendFullGameState] Sent full state with history for game ${gameId}`,
                );
                console.log(`Player ${username} reconnected to game ${gameId}`);
              }
            }
            break;
          }

          // Handle duplicate connections gracefully
          const existingPlayer = Array.from(authenticatedPlayers.values()).find(
            (p) => p.userId === userId,
          );
          if (existingPlayer && existingPlayer.ws !== ws) {
            console.log(
              `User ${username} establishing new connection, closing old one.`,
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

          ws.send(
            JSON.stringify({
              type: "authenticated",
              userId,
              username,
            } as SimpleServerMsg),
          );

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
                } as SimpleServerMsg),
              );

              // Restore time manager if needed
              await restoreTimeManager(gameId, gameState);
              // Send full state with history for reconnection
              await sendFullGameState(gameId, ws);
              console.log(`Player ${username} reconnected to game ${gameId}`);
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
              } as SimpleServerMsg),
            );
            return;
          }

          const gameId = uuidv4();
          const timeControl = msg.timeControl || { initial: 300, increment: 0 };

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
              () => broadcastClockUpdate(gameId),
            );
            timeManager.start("black"); // Black bans first in solo games
            timeManagers.set(gameId, timeManager);
          }

          // Update player's current game
          await redis.set(KEYS.PLAYER_GAME(currentPlayer.userId), gameId);

          // Subscribe to game channel
          await redisSub.subscribe(KEYS.CHANNELS.GAME_STATE(gameId));

          ws.send(
            JSON.stringify({
              type: "game-created",
              gameId,
              timeControl,
            } as SimpleServerMsg),
          );
          console.log(
            `Solo game ${gameId} created for ${currentPlayer.username} with time control ${timeControl.initial}+${timeControl.increment}`,
          );
          break;
        }

        case "join-game": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg),
            );
            return;
          }

          const { gameId } = msg;

          // Check if already in this game
          const currentGameId = await redis.get(
            KEYS.PLAYER_GAME(currentPlayer.userId),
          );
          if (currentGameId === gameId) {
            console.log(
              `Player ${currentPlayer.username} already in game ${gameId}, sending current state`,
            );
            await sendFullGameState(gameId, ws);
            break;
          }

          const gameState = await getGameState(gameId);

          if (!gameState) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Game not found",
              } as SimpleServerMsg),
            );
            return;
          }

          // Update player's current game
          await redis.set(KEYS.PLAYER_GAME(currentPlayer.userId), gameId);

          // Subscribe to game channel
          await redisSub.subscribe(KEYS.CHANNELS.GAME_STATE(gameId));

          // Send full state with history when joining a game
          await sendFullGameState(gameId, ws);
          console.log(`Player ${currentPlayer.username} joined game ${gameId}`);
          break;
        }

        case "action": {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Not authenticated",
              } as SimpleServerMsg),
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
              } as SimpleServerMsg),
            );
            return;
          }

          // Create game instance from saved state
          const game = new BanChess(gameState.fen);

          // BanChess handles ALL validation
          const result = game.play(action as Parameters<typeof game.play>[0]);

          if (result.success) {
            console.log(`Action in game ${gameId}:`, action);

            // Use BanChess serialization to store the action
            const serializedAction = BanChess.serializeAction(
              action as Parameters<typeof BanChess.serializeAction>[0],
            );
            await addActionToHistory(gameId, serializedAction);

            // Update game state in Redis with PGN for complete game reconstruction
            gameState.fen = game.fen();
            gameState.pgn = game.pgn(); // Store PGN for full history
            gameState.lastMoveTime = Date.now();
            gameState.moveCount = (gameState.moveCount || 0) + 1;
            await saveGameState(gameId, gameState);

            // Handle clock switching after successful move/ban
            const timeManager = timeManagers.get(gameId);
            if (timeManager && !game.gameOver()) {
              const fen = game.fen();
              const fenParts = fen.split(" ");
              const chessTurn = fenParts[1] === "w" ? "white" : "black";
              const banState = fenParts[6];
              const isNextActionBan = banState && banState.includes(":ban");

              // Determine who acts next
              // For ban phase, the banning player is the opposite of current turn
              // For move phase, it's the current turn player
              const nextPlayer: "white" | "black" = isNextActionBan
                ? chessTurn === "white"
                  ? "black"
                  : "white"
                : chessTurn;

              timeManager.switchPlayer(nextPlayer);
            }

            await broadcastGameState(gameId);

            // Stop clocks if game is over
            if (game.gameOver() && timeManager) {
              timeManager.destroy();
              timeManagers.delete(gameId);
            }
          } else {
            console.log(
              `Invalid action in game ${gameId}:`,
              action,
              "Error:",
              result.error,
            );
            ws.send(
              JSON.stringify({
                type: "error",
                message: result.error || "Invalid action",
              } as SimpleServerMsg),
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
              } as SimpleServerMsg),
            );
            return;
          }

          const position = await addToQueue(
            currentPlayer.userId,
            currentPlayer.username,
          );
          console.log(
            `${currentPlayer.username} joined queue (position ${position})`,
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
              } as SimpleServerMsg),
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
              } as SimpleServerMsg),
            );
            return;
          }

          // Disable give-time if player is playing against themselves
          if (gameState.whitePlayerId === gameState.blackPlayerId) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Cannot give time when playing both sides",
              } as SimpleServerMsg),
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
              } as SimpleServerMsg),
            );
            return;
          }

          // Check if game is still active
          if (gameState.gameOver) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Game has already ended",
              } as SimpleServerMsg),
            );
            return;
          }

          // Check if time control is enabled
          if (!gameState.timeControl) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "This game has no time control",
              } as SimpleServerMsg),
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
                  } as SimpleServerMsg),
                );
              }
            });

            // Also send clock update
            broadcastClockUpdate(gameId);

            console.log(
              `[give-time] ${giverColor} gave ${timeToGive} seconds to ${recipientColor} in game ${gameId}`,
            );
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Time manager not found for this game",
              } as SimpleServerMsg),
            );
          }
          break;
        }
      }
    } catch (err) {
      console.error("Error handling message:", err);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Server error",
        } as SimpleServerMsg),
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
          `Player ${currentPlayer.username} disconnected from game ${gameId}`,
        );
        // Note: We don't remove the game or player from game, allowing reconnection
      }
    }
    // Clean up ping/pong tracking
    lastPong.delete(ws);
    lastPing.delete(ws);
  });
});

// Simple HTTP health check endpoint
import { createServer } from "http";

const healthServer = createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "websocket-server",
        connections: wss.clients.size,
        activeManagers: timeManagers.size,
      }),
    );
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

// Start health check server on port 3002
healthServer.listen(3002, () => {
  console.log("[WebSocket] Health check endpoint available on port 3002");
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n[WebSocket] Received ${signal}, shutting down gracefully...`);

  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close(1000, "Server shutting down");
  });

  // Destroy all time managers
  timeManagers.forEach((tm) => tm.destroy());
  timeManagers.clear();

  // Close WebSocket server
  wss.close(() => {
    console.log("[WebSocket] Server closed");
  });

  // Shutdown Redis connections
  await redisShutdown();

  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
