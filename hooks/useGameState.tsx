"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ReadyState } from "react-use-websocket";
import { useGameWebSocket } from "@/contexts/WebSocketContext";
import { BanChess } from "ban-chess.ts";
import type {
  SimpleGameState,
  SimpleServerMsg,
  SimpleClientMsg,
  Action,
  HistoryEntry,
  GameEvent,
  Square,
} from "@/lib/game-types";
import soundManager from "@/lib/sound-manager";
import { getUserRole } from "@/lib/game-utils";
import { useAuth } from "@/components/AuthProvider";

export function useGameState() {
  const router = useRouter();
  const { user } = useAuth();
  const wsContext = useGameWebSocket();

  // Handle null context (should not happen if provider is set up correctly)
  if (!wsContext) {
    throw new Error("useGameState must be used within WebSocketProvider");
  }

  const { sendMessage, lastMessage, readyState, isAuthenticated: wsAuthenticated } = wsContext;

  // State management - maintain persistent BanChess instance
  const [game, setGame] = useState<BanChess | null>(null);
  const [gameState, setGameState] = useState<SimpleGameState | null>(null); // Keep for UI elements that need it
  const [error, setError] = useState<{ type: 'auth' | 'game' | 'network' | 'unknown'; message: string } | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  // Refs for tracking
  const previousFen = useRef<string | null>(null);
  const moveHistory = useRef<HistoryEntry[]>([]);

  // Connection status - use centralized authentication
  const connected = readyState === ReadyState.OPEN && wsAuthenticated;

  // Helper to check if current game is a local/solo game
  const isLocalGame = useMemo(() => {
    if (!gameState || !gameState.players) return false;
    // Solo games have both white and black player IDs set to the same user
    return gameState.players.white?.id === gameState.players.black?.id;
  }, [gameState]);

  // Get current state from BanChess instance
  const _fen = game?.fen() || null; // Used for debugging, not directly returned
  const activePlayer = game?.getActivePlayer();
  const actionType = game?.getActionType();
  const ply = game?.getPly();
  const _legalActions = game?.getLegalActions() || []; // Used in dests calculation
  
  // Convert legal actions to dests map for Chessground
  const dests = useMemo(() => {
    const destsMap = new Map<Square, Square[]>();
    if (!game) return destsMap;
    
    const actions = game.getLegalActions();
    actions.forEach((action) => {
      // Convert Action object to BCN format string
      const serialized = BanChess.serializeAction(action);
      // Parse BCN format (e.g., "b:e2e4" or "m:d2d4")
      const parts = serialized.split(":");
      if (parts.length === 2) {
        const moveStr = parts[1]; // e.g., "e2e4"
        if (moveStr.length >= 4) {
          const from = moveStr.substring(0, 2) as Square;
          const to = moveStr.substring(2, 4) as Square;
          
          if (!destsMap.has(from)) {
            destsMap.set(from, []);
          }
          destsMap.get(from)!.push(to);
        }
      }
    });
    
    return destsMap;
  }, [game]);

  // Note: dests are now updated from server-provided legalActions in the "state" message handler
  // This ensures client and server are perfectly synchronized for ban/move selections

  // Send helper with JSON stringify
  const send = useCallback(
    (msg: SimpleClientMsg) => {
      if (readyState === ReadyState.OPEN) {
        console.log("[GameState] Sending:", msg.type);
        sendMessage(JSON.stringify(msg));
      } else {
        console.warn("[GameState] Cannot send, not connected:", msg.type);
      }
    },
    [readyState, sendMessage],
  );

  const showNotification = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // Clear after 3 seconds
  }, []);

  // Authentication is now handled centrally in WebSocketContext

  // Add refs to track message processing and prevent duplicates
  const lastProcessedMessage = useRef<string | null>(null);
  const messageCounter = useRef(0);
  const processingMessage = useRef(false);

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage || processingMessage.current) return;
    
    // Check if we've already processed this exact message
    if (lastProcessedMessage.current === lastMessage.data) {
      return; // Skip duplicate message
    }
    
    // Mark as processing to prevent concurrent processing
    processingMessage.current = true;
    lastProcessedMessage.current = lastMessage.data;
    messageCounter.current++;

    // Parse message first to check type
    let msg: SimpleServerMsg;
    try {
      msg = JSON.parse(lastMessage.data) as SimpleServerMsg;
    } catch (e) {
      console.error("[GameState] Failed to parse WebSocket message:", e);
      return;
    }

    // Only log non-clock-update messages to reduce console spam
    if (msg.type !== "clock-update") {
      console.log("[GameState] WebSocket message:", msg.type, msg);
    }

    try {
      switch (msg.type) {
        case "authenticated": {
          // Authentication is now handled centrally in WebSocketContext
          // Don't auto-join here - let the game page handle it
          break;
        }

        case "state":
          // Create or update BanChess instance from server FEN
          if (msg.fen) {
            setCurrentGameId(msg.gameId);
            
            // Create/update persistent BanChess instance
            try {
              const newGame = new BanChess(msg.fen);
              setGame(newGame);
              
              console.log("[GameState] BanChess instance updated:", {
                fen: newGame.fen(),
                ply: newGame.getPly(),
                activePlayer: newGame.getActivePlayer(),
                actionType: newGame.getActionType(),
                legalActionsCount: newGame.getLegalActions().length,
              });
            } catch (e) {
              console.error("[GameState] Failed to create BanChess instance:", e);
              setError({ type: "game", message: "Failed to parse game state" });
            }
            
            // Keep minimal state for UI elements that still need it
            setGameState((prev) => {
              // Preserve history if not provided (incremental updates)
              // Only use msg.history if it's a full state update (e.g., on join)
              let history: HistoryEntry[] | string[] = prev?.history || [];
              
              if (msg.history) {
                // Full history provided - use it
                history = msg.history;
              } else if (msg.lastMove && Array.isArray(history)) {
                // Incremental update - append to existing history
                // Only append if history is HistoryEntry[] (not string[])
                if (history.length === 0 || typeof history[0] !== 'string') {
                  history = [...(history as HistoryEntry[]), msg.lastMove];
                }
              }
              
              return {
                ...msg,
                fen: msg.fen,
                history,
                timeControl: msg.timeControl,
                clocks: msg.clocks,
                startTime: msg.startTime,
                players: msg.players,
                gameOver: msg.gameOver,
                result: msg.result,
              };
            });
            
            // Clear currentGameId if game is over
            if (msg.gameOver) {
              setCurrentGameId(null);
            }

            // Handle events if provided
            if (msg.events) {
              setGameEvents(msg.events);
            }

            // Play sound effects for moves
            if (previousFen.current && msg.fen !== previousFen.current) {
              const prevPieces = (previousFen.current.match(/[prnbqk]/gi) || [])
                .length;
              const currentPieces = (msg.fen.match(/[prnbqk]/gi) || []).length;

              soundManager.playMoveSound({
                check: msg.inCheck === true,
                capture: currentPieces < prevPieces,
              });
              showNotification("Move made!", "info");
            }
            previousFen.current = msg.fen;

            if (msg.gameOver) {
              console.log("[GameState] Game Over:", msg.result);
              const userRole = getUserRole(gameState, user?.userId);
              soundManager.playEvent("game-end", {
                result: msg.result,
                playerRole: userRole.role,
              });
              showNotification("Game Over!", "info");
            }
          }
          break;

        case "joined":
          console.log("[GameState] Joined game:", msg.gameId);
          setCurrentGameId(msg.gameId);
          // Clear history for new game
          moveHistory.current = [];
          // Server will send a full state message next
          soundManager.playEvent("game-start");
          showNotification(`Joined game ${msg.gameId}`, "success");
          break;

        case "game-created":
          console.log("[GameState] Game created:", msg.gameId);
          // Don't set currentGameId here - let GameClient handle it when joining
          // Navigate immediately - the game page will handle joining
          router.push(`/game/${msg.gameId}`);
          showNotification(`Game created: ${msg.gameId}`, "success");
          break;

        case "matched":
          console.log("[GameState] Matched with opponent, game:", msg.gameId);
          // Don't set currentGameId here - let GameClient handle it when joining
          // Navigate immediately - the game page will handle joining
          router.push(`/game/${msg.gameId}`);
          showNotification(`Matched with ${msg.opponent}`, "success");
          break;

        case "queued":
          console.log("[GameState] Queued, position:", msg.position);
          break;

        case "clock-update":
          // Update only the clocks in the current game state
          setGameState((prev) => {
            if (prev && prev.gameId === msg.gameId) {
              return {
                ...prev,
                clocks: msg.clocks,
              };
            }
            return prev;
          });
          break;

        case "timeout":
          console.log(
            "[GameState] Timeout in game:",
            msg.gameId,
            "Winner:",
            msg.winner,
          );
          // Update game state with timeout result - server is source of truth
          setGameState((prev) => {
            if (prev && prev.gameId === msg.gameId) {
              return {
                ...prev,
                gameOver: true,
                result: `${msg.winner === "white" ? "White" : "Black"} wins on time!`,
              };
            }
            return prev;
          });
          // Clear currentGameId when game ends
          if (currentGameId === msg.gameId) {
            setCurrentGameId(null);
          }
          // Get current game state to determine player role
          const currentGameState = gameState;
          const userRole = getUserRole(currentGameState, user?.userId);
          const resultText = `${msg.winner === "white" ? "White" : "Black"} wins on time!`;
          soundManager.playEvent("game-end", {
            result: resultText,
            playerRole: userRole.role,
          }); // Play sound only when server confirms timeout
          showNotification(`${msg.winner === "white" ? "White" : "Black"} wins on time!`, "info");
          break;

        case "game-event":
          // Add new event to the list
          if (msg.event) {
            setGameEvents((prev) => [...prev, msg.event]);
          }
          break;

        case "error":
          console.error("[GameState] Server error:", msg.message);
          setError({ type: "network", message: msg.message });
          showNotification(`Error: ${msg.message}`, "error");
          setTimeout(() => setError(null), 5000);
          break;

        case "pong":
          // Heartbeat pong response - handled by WebSocketContext for latency tracking
          // No action needed here
          break;

        case "username-changed":
          // Handle username change notification
          console.log(
            "[GameState] Username changed:",
            msg.oldUsername,
            "→",
            msg.newUsername,
          );
          // You might want to update local state or show a notification
          break;

        case "opponent-username-changed":
          // Handle opponent username change
          console.log(
            "[GameState] Opponent username changed:",
            msg.oldUsername,
            "→",
            msg.newUsername,
          );
          // Update the game state with new opponent username
          setGameState((prev) => {
            if (!prev) return prev;
            const updatedPlayers = { ...prev.players };
            if (updatedPlayers.white?.id === msg.playerId) {
              updatedPlayers.white = {
                ...updatedPlayers.white,
                username: msg.newUsername,
              };
            } else if (updatedPlayers.black?.id === msg.playerId) {
              updatedPlayers.black = {
                ...updatedPlayers.black,
                username: msg.newUsername,
              };
            }
            return { ...prev, players: updatedPlayers };
          });
          break;

        case "sync-complete":
          console.log("[GameState] Sync complete, board is up to date.");
          showNotification("Board is up to date.", "success");
          break;

        case "actions-since":
          if (game) {
            const newGame = BanChess.replayFromActions(game.history().concat(msg.actions));
            setGame(newGame);
            console.log(`[GameState] Synced ${msg.actions.length} actions.`);
            showNotification(`Synced ${msg.actions.length} actions.`, "success");
          }
          break;

        default: {
          const _exhaustiveCheck: never = msg;
          console.log(
            "[GameState] Unhandled message type:",
            (_exhaustiveCheck as SimpleServerMsg).type,
          );
        }
      }
    } catch (err) {
      console.error("[GameState] Failed to handle message:", err);
    } finally {
      // Reset processing flag after handling
      processingMessage.current = false;
    }
  }, [lastMessage, router, sendMessage, readyState, currentGameId]);

  // Action handlers - NEW: Uses BanChess serialization
  const sendAction = useCallback(
    (action: Action) => {
      if (currentGameId && connected) {
        // Convert our Action type to BanChess Action type
        const banChessAction = action as unknown; // Temporary cast for compatibility
        // Serialize action using BanChess format
        const serializedAction = BanChess.serializeAction(banChessAction as Parameters<typeof BanChess.serializeAction>[0]);
        send({ 
          type: "action", 
          gameId: currentGameId, 
          action: serializedAction
        });
        console.log("[GameState] Sending serialized action:", serializedAction);
      } else {
        console.warn(
          "[GameState] Cannot send action: not in game or not connected",
        );
      }
    },
    [currentGameId, connected, send],
  );

  const createSoloGame = useCallback(() => {
    if (connected) {
      // Clear any existing local game state before creating new solo game
      if (isLocalGame) {
        setCurrentGameId(null);
        setGameState(null);
        setGame(null);
        setGameEvents([]);
        console.log("[GameState] Cleared old local game state before creating new solo game");
      }
      send({ type: "create-solo-game" });
    } else {
      setError({ type: "network", message: "Not connected to server. Please wait..." });
    }
  }, [connected, send, isLocalGame]);

  const joinQueue = useCallback(() => {
    if (connected) {
      // Clear any existing local game state before joining online queue
      if (isLocalGame) {
        setCurrentGameId(null);
        setGameState(null);
        setGame(null);
        setGameEvents([]);
        console.log("[GameState] Cleared old local game state before joining online queue");
      }
      send({ type: "join-queue" });
    } else {
      setError({ type: "network", message: "Not connected to server. Please wait..." });
    }
  }, [connected, send, isLocalGame]);

  const leaveQueue = useCallback(() => {
    if (connected) {
      send({ type: "leave-queue" });
    }
  }, [connected, send]);

  const joinGame = useCallback(
    (gameId: string) => {
      if (connected) {
        setCurrentGameId(gameId);
        const currentPly = game ? game.getPly() : 0;
        send({ type: "join-game", gameId, ply: currentPly });
      } else {
        setError({ type: "network", message: "Not connected to server. Please wait..." });
      }
    },
    [connected, send, game],
  );

  const giveTime = useCallback(
    (amount: number = 15) => {
      if (currentGameId && connected) {
        send({ type: "give-time", gameId: currentGameId, amount });
      } else {
        setError({ type: "network", message: "Cannot give time: not connected" });
      }
    },
    [currentGameId, connected, send],
  );

  const resignGame = useCallback(() => {
    if (currentGameId && connected) {
      send({ type: "resign", gameId: currentGameId });
      console.log("[GameState] Resigning game:", currentGameId);
      // Don't clear state immediately - let server confirmation handle cleanup
      // This prevents stuttering and race conditions during resignation
    } else {
      console.warn(
        "[GameState] Cannot resign: not in game or not connected",
      );
    }
  }, [currentGameId, connected, send]);

  return {
    // State
    gameState,
    game, // Persistent BanChess instance
    dests, // Legal moves map from BanChess
    activePlayer, // From BanChess instance
    actionType, // From BanChess instance
    ply, // From BanChess instance
    error,
    connected,
    isAuthenticated: wsAuthenticated,
    currentGameId,
    gameEvents,
    isLocalGame, // Helper to identify solo/practice games
    notification,

    // Actions
    sendAction,
    createSoloGame,
    joinQueue,
    leaveQueue,
    joinGame,
    giveTime,
    resignGame,

    // Raw access if needed
    readyState,
    send,
  };
}
