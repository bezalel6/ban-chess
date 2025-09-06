import type { Action, SimpleGameState, GameEvent } from "@/lib/game-types";

/**
 * IGameController - Common interface for all game controllers
 * 
 * This interface defines the contract that all game controllers must implement,
 * whether they're for local play, online play, analysis, or puzzles.
 * 
 * This abstraction allows components to work with any game mode seamlessly.
 */

export interface GameControllerState {
  // Core game state
  gameState: SimpleGameState | null;
  
  // BanChess-specific state
  ply: number;
  activePlayer: "white" | "black";
  actionType: "ban" | "move";
  
  // Legal moves/bans as destinations map
  dests: Map<string, string[]>;
  
  // Game status
  inCheck: boolean;
  gameOver: boolean;
  
  // Connection status (for online games)
  connected: boolean;
  
  // Events log
  events: GameEvent[];
  
  // Error state
  error: { type: string; message: string } | null;
}

export interface IGameController {
  // Get current state
  getState(): GameControllerState;
  
  // Subscribe to state changes
  subscribe(callback: (state: GameControllerState) => void): () => void;
  
  // Game actions
  playAction(action: Action): Promise<boolean>;
  
  // Game control
  reset(): void;
  undo(): boolean;
  
  // Game navigation (for replay)
  navigateToMove(moveIndex: number): boolean;
  
  // Save/Load
  saveGame(): string; // Returns serialized game state
  loadGame(serializedState: string): void;
  
  // Lifecycle
  initialize(): Promise<void>;
  cleanup(): void;
}

/**
 * Controller types for different game modes
 */
export enum GameMode {
  LOCAL = "local",      // Solo play against yourself
  ONLINE = "online",    // Multiplayer via WebSocket
  ANALYSIS = "analysis", // Free move exploration
  PUZZLE = "puzzle",    // Fixed positions with solutions
  REPLAY = "replay"     // Viewing recorded games
}