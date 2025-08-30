// Server-authoritative game state types
// The server sends complete display/interaction instructions
// The client just renders and forwards user input

export interface BoardDisplay {
  fen: string; // Current board position
  orientation: 'white' | 'black'; // Which way to show the board
  highlightedSquares?: Array<{
    // Squares to highlight
    square: string;
    color: 'red' | 'yellow' | 'green';
    type: 'ban' | 'check' | 'lastMove';
  }>;
}

export interface InteractionState {
  enabled: boolean; // Can the player interact?
  allowedMoves?: Record<string, string[]>; // from -> [to] squares
  actionType: 'move' | 'ban'; // What happens when clicked
}

export interface UILabels {
  currentTurnLabel: string; // "White's Turn" / "Black's Turn"
  actionLabel: string; // "Ban a White move" / "Make your move"
  playerRole: string; // "Playing as White" / "Playing as Black"
  gameStatus?: string; // "Check!" / "Checkmate!" / etc.
}

export interface GameMeta {
  gameId: string;
  isSoloGame: boolean;
  players: {
    white?: string;
    black?: string;
  };
}

// Complete game state sent from server
export interface GameStateV2 {
  board: BoardDisplay;
  interaction: InteractionState;
  ui: UILabels;
  meta: GameMeta;
}

// Messages from server to client
export type ServerMessageV2 =
  | { type: 'authenticated'; userId: string; username: string }
  | { type: 'game-state'; state: GameStateV2 }
  | { type: 'game-created'; gameId: string }
  | { type: 'error'; message: string };

// Messages from client to server
export type ClientMessageV2 =
  | { type: 'authenticate'; userId: string; username: string }
  | { type: 'create-solo-game' }
  | { type: 'join-game'; gameId: string }
  | { type: 'action'; gameId: string; from: string; to: string };

// Helper to convert allowed moves to chessground format
export function movesToDests(
  allowedMoves?: Record<string, string[]>
): Map<string, string[]> {
  const dests = new Map<string, string[]>();
  if (!allowedMoves) return dests;

  Object.entries(allowedMoves).forEach(([from, tos]) => {
    dests.set(from, tos);
  });

  return dests;
}
