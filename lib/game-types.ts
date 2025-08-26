// Re-export types from ban-chess.ts library
export type {
  Move,
  Ban,
  Action,
  ActionResult,
  HistoryEntry,
} from 'ban-chess.ts';

// Import types needed for custom definitions
import type { Move, Ban, HistoryEntry } from 'ban-chess.ts';

export type ClientMsg =
  | { type: 'authenticate'; userId: string; username: string }
  | { type: 'join-queue' }
  | { type: 'leave-queue' }
  | { type: 'join-game'; gameId: string }
  | { type: 'ban'; gameId: string; ban: Ban }
  | { type: 'move'; gameId: string; move: Move }
  | { type: 'ping' };

export type ServerMsg =
  | {
      type: 'state';
      fen: string;
      pgn: string;
      nextAction: 'ban' | 'move';
      legalMoves?: Move[];
      legalBans?: Ban[];
      history?: HistoryEntry[];
      turn: 'white' | 'black';
      gameId: string;
      players?: { white?: string; black?: string }; // usernames
    }
  | { type: 'error'; message: string; error?: string }
  | { type: 'authenticated'; userId: string; username: string }
  | { type: 'queued'; position: number }
  | { type: 'matched'; gameId: string; color: 'white' | 'black'; opponent?: string }
  | { type: 'joined'; gameId: string; color: 'white' | 'black'; players?: { white?: string; black?: string } }
  | { type: 'pong' };

export interface GameState {
  fen: string;
  pgn: string;
  nextAction: 'ban' | 'move';
  legalMoves: Move[];
  legalBans: Ban[];
  history: HistoryEntry[];
  turn: 'white' | 'black';
  gameId: string;
  playerColor?: 'white' | 'black';
  players?: { white?: string; black?: string };
}
