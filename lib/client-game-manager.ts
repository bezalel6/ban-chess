import { BanChess } from 'ban-chess.ts';
import { SimpleServerMsg, SimpleClientMsg, SimpleGameState, HistoryEntry, GameEvent, Action } from './game-types';
import soundManager from './sound-manager';
import { getUserRole } from './game-utils';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  userId: string;
  username: string;
  provider: string;
}

type Listener = (state: SimpleGameState | null) => void;

export class ClientGameManager {
  private game: BanChess | null = null;
  private gameState: SimpleGameState | null = null;
  private error: { type: 'auth' | 'game' | 'network' | 'unknown'; message: string } | null = null;
  private currentGameId: string | null = null;
  private gameEvents: GameEvent[] = [];
  private listeners: Set<Listener> = new Set();
  private previousFen: string | null = null;
  private processedMessageIds: Set<string> = new Set();

  constructor(initialState?: SimpleGameState) {
    if (initialState) {
      this.gameState = initialState;
      this.game = new BanChess(initialState.fen);
    }
  }

  public handleMessage(msg: SimpleServerMsg & { messageId?: string }, user: User | null, router: AppRouterInstance, showToast: (message: string, type: 'info' | 'error' | 'success') => void) {
    if (msg.messageId && this.processedMessageIds.has(msg.messageId)) {
      return;
    }
    if (msg.messageId) {
      this.processedMessageIds.add(msg.messageId);
      if (this.processedMessageIds.size > 100) {
        const ids = Array.from(this.processedMessageIds);
        this.processedMessageIds = new Set(ids.slice(-100));
      }
    }

    switch (msg.type) {
      case "state": {
        if (msg.fen) {
          this.currentGameId = msg.gameId;
          try {
            this.game = new BanChess(msg.fen);
          } catch {
            this.error = { type: "game", message: "Failed to parse game state" };
          }

          let history: HistoryEntry[] | string[] = this.gameState?.history || [];
          if (msg.history) {
            history = msg.history;
          } else if (msg.lastMove && Array.isArray(history)) {
            if (history.length === 0 || typeof history[0] !== 'string') {
              history = [...(history as HistoryEntry[]), msg.lastMove];
            }
          }
          
          this.gameState = {
            ...msg,
            fen: msg.fen,
            history,
          };

          if (this.previousFen && msg.fen !== this.previousFen) {
            // sound logic
          }
          this.previousFen = msg.fen;

          if (msg.gameOver) {
            const wasAlreadyOver = this.gameState?.gameOver === true;
            if (!wasAlreadyOver && msg.dataSource !== 'completed') {
              const userRole = getUserRole(this.gameState, user?.userId);
              soundManager.playEvent("game-end", {
                result: msg.result,
                playerRole: userRole.role,
              });
              showToast("Game Over!", "info");
            }
          }
        }
        break;
      }
      case "joined": {
        this.currentGameId = msg.gameId;
        if (!this.gameState?.gameOver) {
          soundManager.playEvent("game-start");
          showToast(`Joined game ${msg.gameId}`, "success");
        }
        break;
      }
      case "game-created": {
        router.push(`/game/${msg.gameId}`);
        showToast(`Game created: ${msg.gameId}`, "success");
        break;
      }
      case "matched": {
        if (this.currentGameId === msg.gameId) {
          break;
        }
        this.currentGameId = msg.gameId;
        showToast(`Matched with ${msg.opponent}`, "success");
        router.push(`/game/${msg.gameId}`);
        break;
      }
      case "game-ended": {
        if (this.gameState) {
            this.gameState.gameOver = true;
            this.gameState.result = msg.result;
            this.gameState.resultReason = msg.reason;
        }
        const userRole = getUserRole(this.gameState, user?.userId);
        soundManager.playEvent("game-end", {
          result: msg.result,
          playerRole: userRole?.role,
        });
        const reasonText = msg.reason ? ` by ${msg.reason}` : '';
        showToast(`Game Over: ${msg.result}${reasonText}`, "info");
        break;
      }
      case "clock-update": {
        if (this.gameState && this.gameState.gameId === msg.gameId) {
            this.gameState.clocks = msg.clocks;
        }
        break;
      }
      case "error": {
        this.error = { type: "network", message: msg.message };
        showToast(`Error: ${msg.message}`, "error");
        break;
      }
    }
    this.notify();
  }

  public getGameState(): SimpleGameState | null {
    return this.gameState;
  }
  
  public getGame(): BanChess | null {
      return this.game;
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.gameState));
  }

  public createSoloGameMsg(): SimpleClientMsg {
    return { type: 'create-solo-game' };
  }

  public joinQueueMsg(): SimpleClientMsg {
    return { type: 'join-queue' };
  }

  public leaveQueueMsg(): SimpleClientMsg {
    return { type: 'leave-queue' };
  }

  public joinGameMsg(gameId: string): SimpleClientMsg {
    const currentPly = this.game ? this.game.getPly() : 0;
    return { type: 'join-game', gameId, ply: currentPly };
  }

  public giveTimeMsg(gameId: string, amount: number = 15): SimpleClientMsg {
    return { type: 'give-time', gameId, amount };
  }

  public resignGameMsg(gameId: string): SimpleClientMsg {
    return { type: 'resign', gameId };
  }

  public offerDrawMsg(gameId: string): SimpleClientMsg {
    return { type: 'offer-draw', gameId };
  }

  public acceptDrawMsg(gameId: string): SimpleClientMsg {
    return { type: 'accept-draw', gameId };
  }

  public declineDrawMsg(gameId: string): SimpleClientMsg {
    return { type: 'decline-draw', gameId };
  }

  public sendActionMsg(gameId: string, action: Action): SimpleClientMsg {
    const serializedAction = BanChess.serializeAction(action as Parameters<typeof BanChess.serializeAction>[0]);
    return { type: 'action', gameId, action: serializedAction };
  }
}