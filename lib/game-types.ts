export interface Move {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface Ban {
  from: string;
  to: string;
}

export type Action = 
  | { move: Move }
  | { ban: Ban };

export interface ActionResult {
  success: boolean;
  action?: Action;
  san?: string;
  error?: string;
  newFen?: string;
  gameOver?: boolean;
  checkmate?: boolean;
  stalemate?: boolean;
}

export interface HistoryEntry {
  turnNumber: number;
  player: 'white' | 'black';
  actionType: 'ban' | 'move';
  action: Ban | Move;
  san?: string;
  fen: string;
  bannedMove?: Ban;
}

export type ClientMsg =
  | { type: "create"; gameId: string }
  | { type: "join"; gameId: string }
  | { type: "ban"; gameId: string; ban: Ban }
  | { type: "move"; gameId: string; move: Move };

export type ServerMsg =
  | { 
      type: "state"; 
      fen: string; 
      pgn: string; 
      nextAction: "ban" | "move"; 
      legalMoves?: Move[]; 
      legalBans?: Ban[];
      history?: HistoryEntry[];
      turn: 'white' | 'black';
      gameId: string;
    }
  | { type: "error"; message: string; error?: string }
  | { type: "created"; gameId: string }
  | { type: "joined"; gameId: string; color: 'white' | 'black' };

export interface GameState {
  fen: string;
  pgn: string;
  nextAction: "ban" | "move";
  legalMoves: Move[];
  legalBans: Ban[];
  history: HistoryEntry[];
  turn: 'white' | 'black';
  gameId: string;
  playerColor?: 'white' | 'black';
}