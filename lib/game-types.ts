// Simplified types that rely on FEN as the source of truth

export interface Move {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface Ban {
  from: string;
  to: string;
}

export type Action = { move: Move } | { ban: Ban };

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
}

// Server messages - simplified
export type SimpleServerMsg = 
  | { type: 'state'; fen: string; gameId: string; players: { white?: string; black?: string }; isSoloGame?: boolean; legalActions?: string[]; nextAction?: 'move' | 'ban'; playerColor?: 'white' | 'black'; gameOver?: boolean; result?: string }
  | { type: 'joined'; gameId: string; color: 'white' | 'black'; players: { white?: string; black?: string }; isSoloGame?: boolean }
  | { type: 'authenticated'; userId: string; username: string }
  | { type: 'queued'; position: number }
  | { type: 'matched'; gameId: string; color: 'white' | 'black'; opponent?: string }
  | { type: 'error'; message: string }
  | { type: 'solo-game-created'; gameId: string };

// Client messages - simplified
export type SimpleClientMsg =
  | { type: 'authenticate'; userId: string; username: string }
  | { type: 'join-game'; gameId: string }
  | { type: 'join-queue' }
  | { type: 'leave-queue' }
  | { type: 'create-solo-game' }
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