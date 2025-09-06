import { BanChess } from "ban-chess.ts";
import type { Action as BanChessAction } from "ban-chess.ts";
import type { Action, SimpleGameState, GameEvent, Move, Ban } from "@/lib/game-types";
import type { IGameController, GameControllerState } from "./IGameController";

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
      gameOver: this.game.gameOver(),
      result: this.game.gameOver() ? this.getGameResult() : undefined,
      resultReason: this.game.gameOver() ? this.getResultReason() : undefined,
      history: history,
      actionHistory: this.fullActionHistory, // Always return full history
    };
  }
  
  private getGameResult(): string {
    if (this.game.inCheckmate()) {
      return this.game.getActivePlayer() === "white" ? "0-1" : "1-0";
    }
    if (this.game.inStalemate()) {
      return "1/2-1/2";
    }
    return "1/2-1/2"; // Draw
  }
  
  private getResultReason(): string {
    if (this.game.inCheckmate()) {
      return "checkmate";
    }
    if (this.game.inStalemate()) {
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
    
    return {
      gameState: this.createGameState(),
      ply: this.game.getPly(),
      activePlayer: this.game.getActivePlayer(),
      actionType: this.game.getActionType(),
      dests,
      inCheck: this.game.inCheck(),
      gameOver: this.game.gameOver(),
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
    const gameOver = this.game.gameOver();
    const inCheck = this.game.inCheck();
    const inCheckmate = this.game.inCheckmate();
    const legalMoves = this.game.getLegalActions().length;
    
    // Always log after bans to track the issue
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
    
    if (inCheck && legalMoves === 0 && !gameOver) {
      debugLog(`⚠️ BUG DETECTED: King in check with 0 legal moves but gameOver()=false`);
      debugLog(`This should be checkmate! ban-chess.ts v${BanChess.VERSION} is not detecting it.`);
      debugLog(`Full state:`, {
        ply: this.game.getPly(),
        activePlayer: this.game.getActivePlayer(),
        inCheck: this.game.inCheck(),
        inCheckmate: this.game.inCheckmate(),
        inStalemate: this.game.inStalemate(),
        gameOver: this.game.gameOver(),
        legalActions: this.game.getLegalActions().length,
        currentBan: this.game.currentBannedMove,
        fen: this.game.fen(),
        actionHistory: this.game.getActionHistory().slice(-3),
      });
    }
    
    if (gameOver && inCheckmate) {
      debugLog(`✓ Checkmate properly detected after ${actionStr}`);
    }
    
    if (result.success) {
      // Update the full action history
      this.fullActionHistory = this.game.getActionHistory();
      
      // Add event for the action
      const actionType = 'move' in action ? 'move' : 'ban';
      const player = this.game.getActivePlayer() === "white" ? "black" : "white"; // Previous player
      
      this.addEvent({
        timestamp: Date.now(),
        type: actionType === 'move' ? 'move-made' : 'ban-made',
        message: `${player} ${actionType === 'move' ? 'played' : 'banned'} ${result.san || ''}`,
        player,
        metadata: actionType === 'move' 
          ? { move: (action as { move: Move }).move } 
          : { ban: (action as { ban: Ban }).ban },
      });
      
      // Check for game end
      if (this.game.gameOver()) {
        let eventType: GameEvent['type'] = 'draw';
        if (this.game.inCheckmate()) {
          eventType = 'checkmate';
        } else if (this.game.inStalemate()) {
          eventType = 'stalemate';
        }
        
        this.addEvent({
          timestamp: Date.now(),
          type: eventType,
          message: `Game ended: ${this.getResultReason()}`,
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