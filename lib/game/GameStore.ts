import { BanChess } from 'ban-chess.ts';
import type { 
  SimpleGameState, 
  SimpleServerMsg, 
  SimpleClientMsg,
  Action,
  GameEvent
} from '@/lib/game-types';
import { wsManager } from '@/lib/websocket/WebSocketManager';
import soundManager from '@/lib/sound-manager';

export interface UserRole {
  role: 'white' | 'black' | 'spectator';
  canMove: boolean;
  canBan: boolean;
  orientation: 'white' | 'black';
}

type GameListener = (state: SimpleGameState | null) => void;
type RoleListener = (role: UserRole) => void;

/**
 * Centralized game state management following Lichess patterns.
 * Manages all game states and provides client-side intelligence for role determination.
 */
export class GameStore {
  private games: Map<string, SimpleGameState> = new Map();
  private gameInstances: Map<string, BanChess> = new Map();
  private currentGameId: string | null = null;
  private gameListeners: Map<string, Set<GameListener>> = new Map();
  private roleListeners: Map<string, Set<RoleListener>> = new Map();
  private globalListeners: Set<GameListener> = new Set();
  private gameEvents: Map<string, GameEvent[]> = new Map();
  private userId: string | null = null;
  private username: string | null = null;

  constructor() {
    // Subscribe to WebSocket messages
    this.setupMessageHandlers();
    
    // Make available for debugging
    if (typeof window !== 'undefined') {
      (window as unknown as { gameStore: GameStore }).gameStore = this;
    }
  }

  /**
   * Setup WebSocket message handlers
   */
  private setupMessageHandlers(): void {
    // Handle all game-related messages
    wsManager.subscribe('state', (msg: SimpleServerMsg) => {
      if (msg.type === 'state') {
        this.handleGameState(msg);
      }
    });

    wsManager.subscribe('game-event', (msg: SimpleServerMsg) => {
      if (msg.type === 'game-event') {
        this.handleGameEvent(msg);
      }
    });

    // Remove this subscription - moves and bans come through game-event

    wsManager.subscribe('clock-update', (msg: SimpleServerMsg) => {
      if (msg.type === 'clock-update') {
        this.handleClockUpdate(msg);
      }
    });

    wsManager.subscribe('game-ended', (msg: SimpleServerMsg) => {
      if (msg.type === 'game-ended') {
        this.handleGameOver(msg);
      }
    });

    // Other message types
    wsManager.subscribe('joined', (msg: SimpleServerMsg) => {
      if (msg.type === 'joined') {
        this.handleJoinedGame(msg);
      }
    });
    
    wsManager.subscribe('authenticated', (msg: SimpleServerMsg) => {
      if (msg.type === 'authenticated') {
        this.setUser(msg.userId, msg.username);
      }
    });

    wsManager.subscribe('error', (msg: SimpleServerMsg) => {
      if (msg.type === 'error') {
        console.error('[GameStore] Server error:', msg.message);
      }
    });

    // Handle queue expiration notification
    wsManager.subscribe('queue-expired', (msg: SimpleServerMsg) => {
      if (msg.type === 'queue-expired') {
        console.log('[GameStore] Queue expired:', msg.message);
        // The user has been removed from queue - they can re-queue if they want
        // You could also trigger a notification to the user here
      }
    });
  }

  /**
   * Set current user information
   */
  public setUser(userId: string | null, username: string | null): void {
    this.userId = userId;
    this.username = username;
    
    // Re-evaluate roles for all games
    this.games.forEach((_, gameId) => {
      this.notifyRoleListeners(gameId);
    });
  }

  /**
   * Handle game state update
   */
  private handleGameState(msg: SimpleServerMsg): void {
    if (msg.type !== 'state') return;
    
    
    const gameId = msg.gameId;
    const state: SimpleGameState = {
      fen: msg.fen,
      gameId: msg.gameId,
      players: msg.players,
      activePlayer: msg.activePlayer,
      ply: msg.ply,
      gameOver: msg.gameOver,
      result: msg.result,
      inCheck: msg.inCheck,
      history: msg.history,
      timeControl: msg.timeControl,
      clocks: msg.clocks,
      startTime: msg.startTime,
      dataSource: msg.dataSource
    };
    
    // Update or create BanChess instance
    if (!this.gameInstances.has(gameId) || this.games.get(gameId)?.fen !== state.fen) {
      this.gameInstances.set(gameId, new BanChess(state.fen));
    }
    
    // Store game state
    this.games.set(gameId, state);
    
    // Handle sounds
    this.handleGameSounds(gameId, state);
    
    // Notify listeners
    this.notifyGameListeners(gameId, state);
    this.notifyRoleListeners(gameId);
    this.notifyGlobalListeners(state);
  }

  /**
   * Handle game event (notifications)
   */
  private handleGameEvent(msg: SimpleServerMsg): void {
    if (msg.type !== 'game-event') return;
    
    const gameId = msg.gameId;
    const event = msg.event;
    
    // Store event for activity log
    if (!this.gameEvents.has(gameId)) {
      this.gameEvents.set(gameId, []);
    }
    this.gameEvents.get(gameId)!.push(event);
    
    // Handle specific event types if needed
    console.log('[GameStore] Game event:', gameId, event.type, event.message);
  }
  
  /**
   * Handle joined game message
   */
  private handleJoinedGame(msg: SimpleServerMsg): void {
    if (msg.type !== 'joined') return;
    
    this.currentGameId = msg.gameId;
    console.log('[GameStore] Joined game:', msg.gameId, 'as', msg.color);
  }

  /**
   * Handle clock update
   */
  private handleClockUpdate(msg: SimpleServerMsg): void {
    if (msg.type !== 'clock-update') return;
    
    const gameId = msg.gameId;
    const game = this.games.get(gameId);
    if (!game || !msg.clocks) return;
    
    const updatedState = {
      ...game,
      clocks: msg.clocks
    };
    
    this.games.set(gameId, updatedState);
    this.notifyGameListeners(gameId, updatedState);
  }

  /**
   * Handle game over
   */
  private handleGameOver(msg: SimpleServerMsg): void {
    if (msg.type !== 'game-ended') return;
    
    const gameId = msg.gameId;
    const game = this.games.get(gameId);
    if (!game) return;
    
    const updatedState = {
      ...game,
      gameOver: true,
      result: msg.result,
      resultReason: msg.reason
    };
    
    this.games.set(gameId, updatedState);
    
    // Play game over sound
    soundManager.playEvent('game-end');
    
    this.notifyGameListeners(gameId, updatedState);
    this.notifyRoleListeners(gameId);
  }

  /**
   * Handle spectators update - currently unused
   */
  private handleSpectatorsUpdate(gameId: string, msg: Record<string, unknown>): void {
    const game = this.games.get(gameId);
    if (!game) return;
    
    const updatedState = {
      ...game,
      spectatorCount: msg.count || 0
    };
    
    this.games.set(gameId, updatedState);
    this.notifyGameListeners(gameId, updatedState);
  }

  /**
   * Handle game sounds
   */
  private handleGameSounds(gameId: string, _state: SimpleGameState): void {
    // Only play sounds for the current game
    if (gameId !== this.currentGameId) return;
    
    // Play move/ban sounds based on action type
    const gameInstance = this.gameInstances.get(gameId);
    if (gameInstance) {
      const actionType = gameInstance.getActionType();
      if (actionType === 'move') {
        soundManager.playEvent('move');
      } else if (actionType === 'ban') {
        soundManager.playEvent('ban');
      }
    }
  }

  /**
   * Get user role for a game (Lichess pattern - client-side intelligence)
   */
  public getUserRole(gameId: string): UserRole {
    const game = this.games.get(gameId);
    
    if (!game || !this.userId) {
      return {
        role: 'spectator',
        canMove: false,
        canBan: false,
        orientation: 'white'
      };
    }
    
    // Determine role based on user ID
    const role = game.players?.white?.id === this.userId ? 'white' :
                  game.players?.black?.id === this.userId ? 'black' :
                  'spectator';
    
    // Get game instance for action type
    const gameInstance = this.gameInstances.get(gameId);
    const activePlayer = gameInstance?.getActivePlayer() || game.activePlayer;
    const actionType = gameInstance?.getActionType();
    
    // Determine permissions
    const isMyTurn = role !== 'spectator' && activePlayer === role;
    const canMove = isMyTurn && actionType === 'move' && !game.gameOver;
    const canBan = isMyTurn && actionType === 'ban' && !game.gameOver;
    
    // Board orientation
    const orientation = role === 'black' ? 'black' : 'white';
    
    return {
      role,
      canMove,
      canBan,
      orientation
    };
  }

  /**
   * Subscribe to a specific game
   */
  public subscribeToGame(gameId: string, listener: GameListener): () => void {
    if (!this.gameListeners.has(gameId)) {
      this.gameListeners.set(gameId, new Set());
    }
    
    this.gameListeners.get(gameId)!.add(listener);
    
    // Send current state if available
    const game = this.games.get(gameId);
    if (game) {
      listener(game);
    }
    
    return () => {
      this.gameListeners.get(gameId)?.delete(listener);
      if (this.gameListeners.get(gameId)?.size === 0) {
        this.gameListeners.delete(gameId);
      }
    };
  }

  /**
   * Subscribe to role changes for a game
   */
  public subscribeToRole(gameId: string, listener: RoleListener): () => void {
    if (!this.roleListeners.has(gameId)) {
      this.roleListeners.set(gameId, new Set());
    }
    
    this.roleListeners.get(gameId)!.add(listener);
    
    // Send current role immediately
    listener(this.getUserRole(gameId));
    
    return () => {
      this.roleListeners.get(gameId)?.delete(listener);
      if (this.roleListeners.get(gameId)?.size === 0) {
        this.roleListeners.delete(gameId);
      }
    };
  }

  /**
   * Subscribe to all game updates
   */
  public subscribeToAll(listener: GameListener): () => void {
    this.globalListeners.add(listener);
    
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Send action to server
   */
  public sendAction(gameId: string, action: Action): void {
    const role = this.getUserRole(gameId);
    
    // Determine action type and validate permissions
    let serializedAction: string;
    
    if ('move' in action) {
      if (!role.canMove) {
        console.warn('[GameStore] Cannot move - not your turn or wrong action type');
        return;
      }
      
      // Serialize move in BCN format
      serializedAction = `m:${action.move.from}${action.move.to}`;
      if (action.move.promotion) {
        serializedAction += action.move.promotion;
      }
      
    } else if ('ban' in action) {
      if (!role.canBan) {
        console.warn('[GameStore] Cannot ban - not your turn or wrong action type');
        return;
      }
      
      // Serialize ban in BCN format
      serializedAction = `b:${action.ban.from}${action.ban.to}`;
    } else {
      console.warn('[GameStore] Unknown action type');
      return;
    }
    
    // Send action message
    const message: SimpleClientMsg = {
      type: 'action',
      gameId,
      action: serializedAction
    };
    
    wsManager.send(message);
  }

  /**
   * Send generic message to server
   */
  public sendMessage(message: SimpleClientMsg): void {
    wsManager.send(message);
  }

  /**
   * Join a game
   */
  public joinGame(gameId: string): void {
    this.currentGameId = gameId;
    
    // Always send join message to server to ensure we get latest state
    const message: SimpleClientMsg = {
      type: 'join-game',
      gameId
    };
    wsManager.send(message);
    
    // Check if we already have state for this game
    const existingState = this.games.get(gameId);
    if (existingState) {
      // Small delay to allow subscriptions to be set up
      setTimeout(() => {
        this.notifyGameListeners(gameId, existingState);
        this.notifyRoleListeners(gameId);
      }, 100);
    }
  }

  /**
   * Leave current game
   */
  public leaveGame(): void {
    if (this.currentGameId) {
      // For now, just clear the current game
      // Server doesn't have a 'leave' message type
      // TODO: Implement proper leave game functionality when server supports it
      
      this.currentGameId = null;
    }
  }

  /**
   * Join matchmaking queue
   */
  public joinQueue(): void {
    const message: SimpleClientMsg = {
      type: 'join-queue'
    };
    
    wsManager.send(message);
  }

  /**
   * Leave matchmaking queue
   */
  public leaveQueue(): void {
    const message: SimpleClientMsg = {
      type: 'leave-queue'
    };
    
    wsManager.send(message);
  }

  /**
   * Create solo game
   */
  public createSoloGame(): void {
    const message: SimpleClientMsg = {
      type: 'create-solo-game'
    };
    
    wsManager.send(message);
  }

  /**
   * Get game state
   */
  public getGameState(gameId: string): SimpleGameState | null {
    return this.games.get(gameId) || null;
  }

  /**
   * Get all active games
   */
  public getAllGames(): Map<string, SimpleGameState> {
    return new Map(this.games);
  }

  /**
   * Get current game ID
   */
  public getCurrentGameId(): string | null {
    return this.currentGameId;
  }

  /**
   * Notify game listeners
   */
  private notifyGameListeners(gameId: string, state: SimpleGameState): void {
    const listeners = this.gameListeners.get(gameId) || new Set();
    listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[GameStore] Game listener error:', error);
      }
    });
  }

  /**
   * Notify role listeners
   */
  private notifyRoleListeners(gameId: string): void {
    const listeners = this.roleListeners.get(gameId) || new Set();
    const role = this.getUserRole(gameId);
    
    listeners.forEach(listener => {
      try {
        listener(role);
      } catch (error) {
        console.error('[GameStore] Role listener error:', error);
      }
    });
  }

  /**
   * Notify global listeners
   */
  private notifyGlobalListeners(state: SimpleGameState): void {
    this.globalListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[GameStore] Global listener error:', error);
      }
    });
  }

  /**
   * Clear all game data
   */
  public clear(): void {
    this.games.clear();
    this.gameInstances.clear();
    this.gameEvents.clear();
    this.currentGameId = null;
  }
}

// Export singleton instance
export const gameStore = new GameStore();