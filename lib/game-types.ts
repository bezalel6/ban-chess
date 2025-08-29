// Simplified types that rely on FEN as the source of truth
// Now with Ban Chess Notation (BCN) support for serialization

export interface Move {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface Ban {
  from: string;
  to: string;
}

// History entry from ban-chess.ts library
export interface HistoryEntry {
  turnNumber: number;
  player: 'white' | 'black';
  actionType: 'ban' | 'move';
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
  fen: string;                     // Current FEN position with ban state
  lastAction?: SerializedAction;   // Last action in BCN format
  moveNumber: number;               // Current move number
}

// Time control configuration
export interface TimeControl {
  initial: number;      // Initial time in seconds
  increment: number;    // Fischer increment in seconds
}

// Player clock state
export interface PlayerClock {
  remaining: number;    // Milliseconds remaining
  lastUpdate: number;   // Server timestamp of last update
}

// Minimal game state - FEN contains everything we need
export interface SimpleGameState {
  fen: string;  // Extended FEN with ban state from ban-chess.ts
  gameId: string;
  players: {
    white?: string;
    black?: string;
  };
  playerColor?: 'white' | 'black';  // Which color this client is playing
  isSoloGame?: boolean;
  legalActions?: string[];  // Legal moves/bans from server
  nextAction?: 'move' | 'ban';  // What action is next
  gameOver?: boolean;
  result?: string;
  inCheck?: boolean;  // Whether the current position has a check
  history?: HistoryEntry[] | string[]; // Move history - can be strings or HistoryEntry objects from ban-chess.ts
  timeControl?: TimeControl;  // Time control settings
  clocks?: {
    white: PlayerClock;
    black: PlayerClock;
  };
  startTime?: number;   // Game start timestamp
}

// Server messages - simplified
export type SimpleServerMsg = 
  | { type: 'state'; fen: string; gameId: string; players: { white?: string; black?: string }; isSoloGame?: boolean; legalActions?: string[]; nextAction?: 'move' | 'ban'; playerColor?: 'white' | 'black'; gameOver?: boolean; result?: string; inCheck?: boolean; history?: HistoryEntry[] | string[]; lastMove?: HistoryEntry; actionHistory?: SerializedAction[]; syncState?: SyncState; timeControl?: TimeControl; clocks?: { white: PlayerClock; black: PlayerClock }; startTime?: number }
  | { type: 'joined'; gameId: string; color: 'white' | 'black'; players: { white?: string; black?: string }; isSoloGame?: boolean; timeControl?: TimeControl }
  | { type: 'authenticated'; userId: string; username: string }
  | { type: 'queued'; position: number }
  | { type: 'matched'; gameId: string; color: 'white' | 'black'; opponent?: string; timeControl?: TimeControl }
  | { type: 'error'; message: string }
  | { type: 'solo-game-created'; gameId: string; timeControl?: TimeControl }
  | { type: 'clock-update'; gameId: string; clocks: { white: PlayerClock; black: PlayerClock } }
  | { type: 'timeout'; gameId: string; winner: 'white' | 'black' };

// Client messages - simplified
export type SimpleClientMsg =
  | { type: 'authenticate'; userId: string; username: string }
  | { type: 'join-game'; gameId: string }
  | { type: 'join-queue'; timeControl?: TimeControl }
  | { type: 'leave-queue' }
  | { type: 'create-solo-game'; timeControl?: TimeControl }
  | { type: 'action'; gameId: string; action: Action };  // Combined move and ban

// Helper functions to parse FEN
export function parseFEN(fen: string) {
  const parts = fen.split(' ');
  return {
    position: parts[0],
    turn: parts[1] === 'w' ? 'white' : 'black' as 'white' | 'black',
    castling: parts[2],
    enPassant: parts[3],
    halfMove: parseInt(parts[4]),
    fullMove: parseInt(parts[5]),
    banState: parts[6] // 7th field: "b:ban", "w:ban", "b:e2e4", etc
  };
}

export function getNextAction(fen: string): 'move' | 'ban' {
  const { banState } = parseFEN(fen);
  return banState && banState.includes(':ban') ? 'ban' : 'move';
}

// Get who is currently doing the banning (b:ban = black bans, w:ban = white bans)
export function getWhoBans(fen: string): 'white' | 'black' | null {
  const { banState } = parseFEN(fen);
  if (!banState || !banState.includes(':ban')) return null;
  return banState.startsWith('w') ? 'white' : 'black';
}

export function getCurrentBan(fen: string): Ban | null {
  const { banState } = parseFEN(fen);
  // Check if there's a ban state and it contains a move (not just ":ban")
  if (banState && banState.includes(':') && !banState.includes(':ban')) {
    const banStr = banState.split(':')[1];
    if (banStr && banStr.length >= 4) {
      return {
        from: banStr.substring(0, 2),
        to: banStr.substring(2, 4)
      };
    }
  }
  return null;
}

export function isGameOver(fen: string): boolean {
  // Check for checkmate (#) or stalemate indicators in FEN
  return fen.includes('#');
}