// Simplified types that rely on FEN as the source of truth
// Now with Ban Chess Notation (BCN) support for serialization

// Chess square type
export type Square = string;

export interface Move {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export interface Ban {
  from: string;
  to: string;
}

// History entry from ban-chess.ts library
export interface HistoryEntry {
  turnNumber: number;
  player: "white" | "black";
  actionType: "ban" | "move";
  action: Ban | Move;
  san?: string;
  fen: string;
  bannedMove?: Ban;
}

export type Action = { move: Move } | { ban: Ban };

// Ban Chess Notation (BCN) - Compact serialization format
// Examples: "b:e2e4" (ban), "m:d2d4" (move), "m:e7e8q" (promotion)
export type SerializedAction = string;

// Sync state for network transmission and game reconstruction
export interface SyncState {
  fen: string; // Current FEN position with ban state
  lastAction?: SerializedAction; // Last action in BCN format
  moveNumber: number; // Current move number
}

// Time control configuration
export interface TimeControl {
  initial: number; // Initial time in seconds
  increment: number; // Fischer increment in seconds
}

// Player clock state
export interface PlayerClock {
  remaining: number; // Milliseconds remaining
  lastUpdate: number; // Server timestamp of last update
}

// Game event types for activity log
export interface GameEvent {
  timestamp: number;
  type:
    | "time-given"
    | "move-made"
    | "ban-made"
    | "game-started"
    | "player-joined"
    | "timeout"
    | "checkmate"
    | "stalemate"
    | "draw"
    | "resignation";
  message: string;
  player?: "white" | "black";
  metadata?: {
    amount?: number;
    recipient?: "white" | "black";
    move?: Move;
    ban?: Ban;
    from?: string;
    to?: string;
    result?: string;
  };
}

// Minimal game state - FEN contains everything we need
export interface SimpleGameState {
  fen: string; // The ONLY source of game state truth
  gameId: string;
  players: {
    white?: { id: string; username: string };
    black?: { id: string; username: string };
  };
  // Server-provided state from new ban-chess.ts APIs:
  activePlayer?: "white" | "black";  // Who acts now
  ply?: number;  // Current ply number
  // These fields are ONLY for display/metadata, NOT game logic:
  gameOver?: boolean;  // For UI display only
  result?: string;     // For UI display only
  history?: HistoryEntry[] | string[]; // For move replay only
  timeControl?: TimeControl; // Time control settings
  clocks?: {
    white: PlayerClock;
    black: PlayerClock;
  };
  startTime?: number; // Game start timestamp
  // REMOVED: legalActions, nextAction, inCheck - these come from BanChess
}

// Server messages - simplified
export type SimpleServerMsg =
  | {
      type: "state";
      fen: string;
      gameId: string;
      players: {
        white?: { id: string; username: string };
        black?: { id: string; username: string };
      };
      legalActions?: string[];
      nextAction?: "move" | "ban";
      activePlayer?: "white" | "black";
      ply?: number;
      gameOver?: boolean;
      result?: string;
      inCheck?: boolean;
      history?: HistoryEntry[] | string[];
      lastMove?: HistoryEntry;
      actionHistory?: SerializedAction[];
      syncState?: SyncState;
      timeControl?: TimeControl;
      clocks?: { white: PlayerClock; black: PlayerClock };
      startTime?: number;
      events?: GameEvent[];
    }
  | {
      type: "joined";
      gameId: string;
      color: "white" | "black";
      players: {
        white?: { id: string; username: string };
        black?: { id: string; username: string };
      };
      timeControl?: TimeControl;
    }
  | { type: "authenticated"; userId: string; username: string }
  | { type: "queued"; position: number }
  | {
      type: "matched";
      gameId: string;
      color: "white" | "black";
      opponent?: string;
      timeControl?: TimeControl;
    }
  | { type: "error"; message: string }
  | { type: "game-created"; gameId: string; timeControl?: TimeControl }
  | {
      type: "clock-update";
      gameId: string;
      clocks: { white: PlayerClock; black: PlayerClock };
    }
  | { type: "timeout"; gameId: string; winner: "white" | "black" }
  | { type: "game-event"; gameId: string; event: GameEvent }
  | { type: "pong" } // Heartbeat pong response from server
  | {
      type: "username-changed";
      oldUsername: string;
      newUsername: string;
      timestamp: number;
      message: string;
    }
  | {
      type: "opponent-username-changed";
      oldUsername: string;
      newUsername: string;
      playerId: string;
    }
  | { type: "sync-complete"; gameId: string }
  | { type: "actions-since"; gameId: string; actions: SerializedAction[] };

// Client messages - simplified
export type SimpleClientMsg =
  | { type: "authenticate"; userId: string; username: string }
  | { type: "join-game"; gameId: string; ply?: number }
  | { type: "join-queue"; timeControl?: TimeControl }
  | { type: "leave-queue" }
  | { type: "create-solo-game"; timeControl?: TimeControl }
  | { type: "action"; gameId: string; action: string } // Serialized action in BCN format (e.g., "b:e2e4" or "m:d2d4")
  | { type: "give-time"; gameId: string; amount: number } // Give time to opponent
  | { type: "resign"; gameId: string } // Resign the current game
  | { type: "ping" }; // Heartbeat ping from client

// Helper functions to parse FEN
export function parseFEN(fen: string) {
  const parts = fen.split(" ");
  return {
    position: parts[0],
    turn: parts[1] === "w" ? "white" : ("black" as "white" | "black"),
    castling: parts[2],
    enPassant: parts[3],
    halfMove: parseInt(parts[4]),
    fullMove: parseInt(parts[5]),
    banState: parts[6], // 7th field: ply number and optional ban (e.g., "1", "2:e2e4", "3", "4:e7e5")
  };
}

export function getNextAction(fen: string): "move" | "ban" {
  const { banState } = parseFEN(fen);
  if (!banState) return "move";
  
  // Extract ply number from ban state (it's either just a number like "1" or "number:move" like "2:e2e4")
  const ply = parseInt(banState.split(":")[0]);
  
  // Odd plies are ban phases, even plies are move phases
  return ply % 2 === 1 ? "ban" : "move";
}

// Get who is currently doing the banning based on ply number
export function getWhoBans(fen: string): "white" | "black" | null {
  const { banState } = parseFEN(fen);
  if (!banState) return null;
  
  // Extract ply number
  const ply = parseInt(banState.split(":")[0]);
  
  // Only odd plies are ban phases
  if (ply % 2 !== 1) return null;
  
  // Ply 1,5,9... = Black bans
  // Ply 3,7,11... = White bans
  return ((ply - 1) / 2) % 2 === 0 ? "black" : "white";
}

export function getCurrentBan(fen: string): Ban | null {
  const { banState } = parseFEN(fen);
  // Check if there's a ban state with a move (format: "ply:move" like "2:e2e4")
  if (banState && banState.includes(":")) {
    const banStr = banState.split(":")[1];
    if (banStr && banStr.length >= 4) {
      return {
        from: banStr.substring(0, 2),
        to: banStr.substring(2, 4),
      };
    }
  }
  return null;
}

export function isGameOver(fen: string): boolean {
  // Check for checkmate (#) or stalemate indicators in FEN
  return fen.includes("#");
}
