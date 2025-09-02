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

export function useGameState() {
  const router = useRouter();
  const wsContext = useGameWebSocket();

  // Handle null context (should not happen if provider is set up correctly)
  if (!wsContext) {
    throw new Error("useGameState must be used within WebSocketProvider");
  }

  const { sendMessage, lastMessage, readyState, isAuthenticated: wsAuthenticated } = wsContext;

  // State management - simplified to just FEN
  const [fen, setFen] = useState<string | null>(null);
  const [gameState, setGameState] = useState<SimpleGameState | null>(null); // Keep for compatibility during migration
  const [error, setError] = useState<string | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [dests, setDests] = useState<Map<Square, Square[]>>(new Map());

  // Refs for tracking
  const previousFen = useRef<string | null>(null);
  const moveHistory = useRef<HistoryEntry[]>([]);

  // Connection status - use centralized authentication
  const connected = readyState === ReadyState.OPEN && wsAuthenticated;

  // Create BanChess instance from FEN
  const game = useMemo(() => {
    if (fen) {
      try {
        return new BanChess(fen);
      } catch (e) {
        console.error("Error creating BanChess instance from FEN:", fen, e);
        return null;
      }
    }
    return null;
  }, [fen]);

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
          // NEW ARCHITECTURE: Only process FEN string
          if (msg.fen) {
            setFen(msg.fen);
            setCurrentGameId(msg.gameId);
            
            // Keep minimal state for compatibility
            setGameState({
              ...msg,
              history: msg.history || [],
              activePlayer: msg.activePlayer,
              ply: msg.ply,
              timeControl: msg.timeControl,
              clocks: msg.clocks,
              startTime: msg.startTime,
            });
            
            // Clear currentGameId if game is over
            if (msg.gameOver) {
              setCurrentGameId(null);
            }

            // Handle events if provided
            if (msg.events) {
              setGameEvents(msg.events);
            }
            
            // Update dests from server-provided legal actions
            if (msg.legalActions) {
              console.log("[GameState] Received legal actions:", msg.legalActions.length, "actions");
              console.log("[GameState] All actions:", msg.legalActions);
              
              const newDests = new Map<Square, Square[]>();
              msg.legalActions.forEach((action: string) => {
                // Parse BCN format (e.g., "b:e2e4" or "m:d2d4")
                const parts = action.split(":");
                if (parts.length === 2) {
                  const moveStr = parts[1]; // e.g., "e2e4"
                  if (moveStr.length >= 4) {
                    const from = moveStr.substring(0, 2) as Square;
                    const to = moveStr.substring(2, 4) as Square;
                    
                    if (!newDests.has(from)) {
                      newDests.set(from, []);
                    }
                    newDests.get(from)!.push(to);
                  }
                }
              });
              
              console.log("[GameState] Created dests map with", newDests.size, "source squares");
              console.log("[GameState] Dests map:", Array.from(newDests.entries()).map(([from, tos]) => `${from}: ${tos.length} moves`));
              setDests(newDests);
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
            }
            previousFen.current = msg.fen;

            if (msg.gameOver) {
              console.log("[GameState] Game Over:", msg.result);
              soundManager.playEvent("game-end");
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
          break;

        case "game-created":
          console.log("[GameState] Game created:", msg.gameId);
          // Don't set currentGameId here - let GameClient handle it when joining
          // Navigate immediately - the game page will handle joining
          router.push(`/game/${msg.gameId}`);
          break;

        case "matched":
          console.log("[GameState] Matched with opponent, game:", msg.gameId);
          // Don't set currentGameId here - let GameClient handle it when joining
          // Navigate immediately - the game page will handle joining
          router.push(`/game/${msg.gameId}`);
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
          soundManager.playEvent("game-end"); // Play sound only when server confirms timeout
          break;

        case "game-event":
          // Add new event to the list
          if (msg.event) {
            setGameEvents((prev) => [...prev, msg.event]);
          }
          break;

        case "error":
          console.error("[GameState] Server error:", msg.message);
          setError(msg.message);
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
          action: serializedAction as unknown as Action // Type compatibility during migration
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
      send({ type: "create-solo-game" });
    } else {
      setError("Not connected to server. Please wait...");
    }
  }, [connected, send]);

  const joinQueue = useCallback(() => {
    if (connected) {
      send({ type: "join-queue" });
    } else {
      setError("Not connected to server. Please wait...");
    }
  }, [connected, send]);

  const leaveQueue = useCallback(() => {
    if (connected) {
      send({ type: "leave-queue" });
    }
  }, [connected, send]);

  const joinGame = useCallback(
    (gameId: string) => {
      if (connected) {
        setCurrentGameId(gameId);
        send({ type: "join-game", gameId });
      } else {
        setError("Not connected to server. Please wait...");
      }
    },
    [connected, send],
  );

  const giveTime = useCallback(
    (amount: number = 15) => {
      if (currentGameId && connected) {
        send({ type: "give-time", gameId: currentGameId, amount });
      } else {
        console.warn(
          "[GameState] Cannot give time: not in game or not connected",
        );
      }
    },
    [currentGameId, connected, send],
  );

  const resignGame = useCallback(() => {
    if (currentGameId && connected) {
      send({ type: "resign", gameId: currentGameId });
      console.log("[GameState] Resigning game:", currentGameId);
      // Clear game state immediately on resignation
      setCurrentGameId(null);
      setGameState(null);
      setFen("");
      setGameEvents([]);
      setDests(new Map());
    } else {
      console.warn(
        "[GameState] Cannot resign: not in game or not connected",
      );
    }
  }, [currentGameId, connected, send]);

  return {
    // State
    gameState,
    game, // NEW: BanChess instance
    dests, // NEW: Legal moves map
    error,
    connected,
    isAuthenticated: wsAuthenticated,
    currentGameId,
    gameEvents,

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
