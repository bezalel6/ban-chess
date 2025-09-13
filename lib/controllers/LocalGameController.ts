import { BanChess } from "ban-chess.ts";
import type { Action as BanChessAction } from "ban-chess.ts";
import type { Action, SimpleGameState, GameEvent, Move, Ban } from "@/lib/game-types";
import type { IGameController, GameControllerState } from "./IGameController";
import soundManager from "@/lib/sound-manager";

// Debug logging helper that includes library version
const debugLog = (message: string, ...args: unknown[]) => {
  console.log(`[LocalGame v${BanChess.VERSION}] ${message}`, ...args);
};

/**
 * LocalGameController - Controller for local ban chess games
 * 
 * This controller manages a BanChess instance directly for solo play.
 * No network communication required - perfect for practicing ban chess
 * or playing against yourself.
 */

export class LocalGameController implements IGameController {
  private game: BanChess;
  private subscribers: Set<(state: GameControllerState) => void> = new Set();
  private events: GameEvent[] = [];
  private currentGameId: string;
  private fullActionHistory: string[] = []; // Store complete action history
  private isNavigating: boolean = false; // Track if we're viewing history
  
  constructor(initialFen?: string) {
    this.game = new BanChess(initialFen);
    this.currentGameId = `local-${Date.now()}`;
    this.fullActionHistory = [];
    
    // Play game start sound for new games
    if (!initialFen) {
      soundManager.playEvent('game-start');
    }
    
    // Add initial event
    this.addEvent({
      timestamp: Date.now(),
      type: "game-started",
      message: "Local game started",
    });
  }
  
  private addEvent(event: GameEvent): void {
    this.events.push(event);
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }
  
  private notifySubscribers(): void {
    const state = this.getState();
    this.subscribers.forEach(callback => callback(state));
  }
  
  /**
   * Helper method to check if the game is actually over, including cases
   * where ban-chess.ts may not properly detect checkmate (especially mate-by-ban)
   */
  private isGameActuallyOver(): boolean {
    // First check the library's gameOver method
    if (this.game.gameOver()) {
      return true;
    }
    
    // Workaround for ban-chess.ts checkmate detection bug
    // If player is in check with 0 legal moves, it's checkmate
    const inCheck = this.game.inCheck();
    const legalActions = this.game.getLegalActions();
    
    if (inCheck && legalActions.length === 0) {
      debugLog(`Checkmate detected via workaround: inCheck=${inCheck}, legalActions=0`);
      return true;
    }
    
    // Check for stalemate (not in check but no legal moves)
    if (!inCheck && legalActions.length === 0) {
      debugLog(`Stalemate detected via workaround: inCheck=${inCheck}, legalActions=0`);
      return true;
    }
    
    return false;
  }

  private createGameState(): SimpleGameState {
    // ALWAYS create history from the full action history, not the current game
    // This ensures the move list always shows all moves
    let rawHistory;
    if (this.fullActionHistory.length > 0) {
      const fullGame = BanChess.replayFromActions(this.fullActionHistory);
      rawHistory = fullGame.history();
    } else {
      rawHistory = [];
    }
    
    // Map ban-chess.ts history to our format
    // In ban chess: plies 1-4 = turn 1, plies 5-8 = turn 2, etc.
    // Formula: Math.floor((ply + 3) / 4)
    const history = rawHistory.map(entry => ({
      turnNumber: Math.floor((entry.ply + 3) / 4),
      player: entry.player,
      actionType: entry.actionType,
      action: entry.action,
      san: entry.san,
      fen: entry.fen,
      bannedMove: entry.bannedMove || undefined,
    }));
    
    // Get player info for local game (same player for both sides)
    const localPlayer = {
      id: "local-player",
      username: "You"
    };
    
    // Use our enhanced game over detection
    const isGameOver = this.isGameActuallyOver();
    
    return {
      gameId: this.currentGameId,
      fen: this.game.fen(),
      players: {
        white: localPlayer,
        black: localPlayer,
      },
      activePlayer: this.game.getActivePlayer(),
      ply: this.game.getPly(),
      inCheck: this.game.inCheck(),
      gameOver: isGameOver,
      result: isGameOver ? this.getGameResult() : undefined,
      resultReason: isGameOver ? this.getResultReason() : undefined,
      history: history,
      actionHistory: this.fullActionHistory, // Always return full history
    };
  }
  
  private getGameResult(): string {
    // Check for checkmate (including workaround for ban-chess.ts bug)
    const inCheck = this.game.inCheck();
    const legalActions = this.game.getLegalActions();
    
    if (this.game.inCheckmate() || (inCheck && legalActions.length === 0)) {
      return this.game.getActivePlayer() === "white" ? "0-1" : "1-0";
    }
    if (this.game.inStalemate() || (!inCheck && legalActions.length === 0)) {
      return "1/2-1/2";
    }
    return "1/2-1/2"; // Draw
  }
  
  private getResultReason(): string {
    // Check for checkmate (including workaround for ban-chess.ts bug)
    const inCheck = this.game.inCheck();
    const legalActions = this.game.getLegalActions();
    
    if (this.game.inCheckmate() || (inCheck && legalActions.length === 0)) {
      return "checkmate";
    }
    if (this.game.inStalemate() || (!inCheck && legalActions.length === 0)) {
      return "stalemate";
    }
    return "draw";
  }
  
  getState(): GameControllerState {
    // Convert legal actions to destinations map
    const dests = new Map<string, string[]>();
    const legalActions = this.game.getLegalActions();
    
    legalActions.forEach((action) => {
      if ('move' in action) {
        const move = action.move;
        if (!dests.has(move.from)) {
          dests.set(move.from, []);
        }
        dests.get(move.from)!.push(move.to);
      } else if ('ban' in action) {
        const ban = action.ban;
        if (!dests.has(ban.from)) {
          dests.set(ban.from, []);
        }
        dests.get(ban.from)!.push(ban.to);
      }
    });
    
    // Use our enhanced game over detection
    const isGameOver = this.isGameActuallyOver();
    
    return {
      gameState: this.createGameState(),
      ply: this.game.getPly(),
      activePlayer: this.game.getActivePlayer(),
      actionType: this.game.getActionType(),
      dests,
      inCheck: this.game.inCheck(),
      gameOver: isGameOver,
      connected: true, // Always "connected" for local games
      events: this.events,
      error: null,
    };
  }
  
  subscribe(callback: (state: GameControllerState) => void): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.getState());
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  async playAction(action: Action): Promise<boolean> {
    // If we're navigating and make a move, truncate future history
    if (this.isNavigating) {
      const currentActions = this.game.getActionHistory();
      this.fullActionHistory = currentActions;
      this.isNavigating = false;
    }
    
    const actionStr = 'move' in action ? `Move ${action.move.from}-${action.move.to}` : `Ban ${action.ban.from}-${action.ban.to}`;
    const actionType = 'move' in action ? 'move' : 'ban';
    
    // Log state BEFORE the action
    if (actionType === 'ban') {
      const beforeState = {
        ply: this.game.getPly(),
        inCheck: this.game.inCheck(),
        gameOver: this.game.gameOver(),
        legalActions: this.game.getLegalActions().length,
      };
      debugLog(`Before ${actionStr}:`, beforeState);
    }
    
    // Cast action to ban-chess.ts Action type (it has stricter Square type)
    const result = this.game.play(action as BanChessAction);
    
    if (!result.success) {
      debugLog(`Action failed: ${actionStr}`);
      return false;
    }
    
    // Log state after successful action
    const gameOver = this.isGameActuallyOver(); // Use our enhanced detection
    const inCheck = this.game.inCheck();
    const inCheckmate = this.game.inCheckmate();
    const legalMoves = this.game.getLegalActions().length;
    
    // Log after bans for debugging
    if (actionType === 'ban') {
      const afterState = {
        ply: this.game.getPly(),
        activePlayer: this.game.getActivePlayer(),
        inCheck,
        inCheckmate,
        gameOver,
        legalActions: legalMoves,
        currentBan: this.game.currentBannedMove,
      };
      debugLog(`After ${actionStr}:`, afterState);
    }
    
    // Log successful checkmate detection (including workaround cases)
    if (gameOver && (inCheckmate || (inCheck && legalMoves === 0))) {
      debugLog(`✓ Checkmate detected after ${actionStr} (library=${inCheckmate}, workaround=${!inCheckmate && inCheck && legalMoves === 0})`);
    }
    
    if (result.success) {
      // Update the full action history
      this.fullActionHistory = this.game.getActionHistory();
      
      // Add event for the action
      const actionType = 'move' in action ? 'move' : 'ban';
      const player = this.game.getActivePlayer() === "white" ? "black" : "white"; // Previous player
      
      // Play appropriate sound for the action
      if (actionType === 'move') {
        // Check the move details for special sounds
        const san = result.san || '';
        const moveDetails = {
          check: san.includes('+') || san.includes('#'),
          capture: san.includes('x'),
          castle: san.includes('O-O'),
          promotion: san.includes('='),
          isOpponent: false, // In local games, you're playing both sides
        };
        soundManager.playMoveSound(moveDetails);
      } else {
        // Play ban sound
        soundManager.playEvent('ban');
      }
      
      // Check for game end and play appropriate sound
      if (gameOver) {
        // In local games, determine result based on who was checkmated
        if (inCheckmate || (inCheck && legalMoves === 0)) {
          // The current player (after the move) is checkmated
          const loser = this.game.getActivePlayer();
          const winner = loser === 'white' ? 'black' : 'white';
          const resultString = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins by checkmate`;
          soundManager.playEvent('game-end', { 
            result: resultString,
            playerRole: null // Local game, no specific role
          });
        } else if (legalMoves === 0) {
          // Stalemate
          soundManager.playEvent('game-end', { 
            result: 'Draw by stalemate',
            playerRole: null
          });
        }
      }
      
      this.addEvent({
        timestamp: Date.now(),
        type: actionType === 'move' ? 'move-made' : 'ban-made',
        message: `${player} ${actionType === 'move' ? 'played' : 'banned'} ${result.san || ''}`,
        player,
        metadata: actionType === 'move' 
          ? { move: (action as { move: Move }).move } 
          : { ban: (action as { ban: Ban }).ban },
      });
      
      // Check for game end (using our enhanced detection)
      if (this.isGameActuallyOver()) {
        let eventType: GameEvent['type'] = 'draw';
        const resultReason = this.getResultReason();
        
        if (resultReason === 'checkmate') {
          eventType = 'checkmate';
        } else if (resultReason === 'stalemate') {
          eventType = 'stalemate';
        }
        
        this.addEvent({
          timestamp: Date.now(),
          type: eventType,
          message: `Game ended: ${resultReason}`,
          metadata: {
            result: this.getGameResult(),
          },
        });
      }
      
      this.notifySubscribers();
      return true;
    }
    
    return false;
  }
  
  reset(): void {
    this.game.reset();
    this.events = [];
    this.currentGameId = `local-${Date.now()}`;
    this.fullActionHistory = [];
    this.isNavigating = false;
    
    // Play game start sound for reset
    soundManager.playEvent('game-start');
    
    this.addEvent({
      timestamp: Date.now(),
      type: "game-started",
      message: "Game reset",
    });
    
    this.notifySubscribers();
  }
  
  undo(): boolean {
    if (this.fullActionHistory.length > 0) {
      // Remove last action from history
      this.fullActionHistory.pop();
      
      // Replay to the new last position
      if (this.fullActionHistory.length === 0) {
        this.game.reset();
      } else {
        this.game = BanChess.replayFromActions(this.fullActionHistory);
      }
      
      this.isNavigating = false;
      
      this.addEvent({
        timestamp: Date.now(),
        type: "move-made",
        message: "Move undone",
      });
      
      this.notifySubscribers();
      return true;
    }
    return false;
  }
  
  navigateToMove(moveIndex: number): boolean {
    // Just like CompletedGameViewer does it!
    if (moveIndex === -1) {
      // Starting position
      this.game = new BanChess();
      this.isNavigating = true;
      this.notifySubscribers();
      return true;
    }
    
    // Check if we're returning to the current/live position
    if (moveIndex === this.fullActionHistory.length - 1) {
      // Return to live position - replay all actions
      if (this.fullActionHistory.length > 0) {
        this.game = BanChess.replayFromActions(this.fullActionHistory);
      } else {
        this.game = new BanChess();
      }
      this.isNavigating = false;
      this.notifySubscribers();
      return true;
    }
    
    if (moveIndex < 0 || moveIndex >= this.fullActionHistory.length) {
      return false;
    }
    
    // Navigate to specific position by replaying actions up to that point
    // This is exactly how CompletedGameViewer does it
    const actionsToReplay = this.fullActionHistory.slice(0, moveIndex + 1);
    this.game = BanChess.replayFromActions(actionsToReplay);
    this.isNavigating = true;
    this.notifySubscribers();
    return true;
  }
  
  saveGame(): string {
    // Always save the full game state, not the navigated position
    const fullGame = this.fullActionHistory.length > 0 
      ? BanChess.replayFromActions(this.fullActionHistory)
      : this.game;
    const syncState = fullGame.getSyncState();
    
    return JSON.stringify({
      syncState: {
        ...syncState,
        moveNumber: Math.floor(syncState.ply / 2) + 1, // Convert ply to move number for compatibility
      },
      gameId: this.currentGameId,
      events: this.events,
      fullActionHistory: this.fullActionHistory,
    });
  }
  
  loadGame(serializedState: string): void {
    try {
      const data = JSON.parse(serializedState);
      if (data.syncState) {
        const syncState = data.syncState;
        // Ensure ply field exists for ban-chess.ts v3
        if (!syncState.ply && syncState.moveNumber) {
          syncState.ply = (syncState.moveNumber - 1) * 2 + 1;
        }
        this.game.loadFromSyncState(syncState);
        this.currentGameId = data.gameId || `local-${Date.now()}`;
        this.events = data.events || [];
        
        // Restore full history if available
        if (data.fullActionHistory) {
          this.fullActionHistory = data.fullActionHistory;
        } else {
          // Rebuild from sync state
          this.fullActionHistory = this.game.getActionHistory();
        }
        
        this.isNavigating = false;
        this.notifySubscribers();
      }
    } catch (error) {
      console.error("Failed to load game:", error);
    }
  }
  
  async initialize(): Promise<void> {
    // No initialization needed for local games
    return Promise.resolve();
  }
  
  cleanup(): void {
    // Clear subscribers
    this.subscribers.clear();
    this.events = [];
  }
}