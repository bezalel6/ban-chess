"use client";

import "@bezalel6/react-chessground/dist/react-chessground.css";
import Chessground from "@bezalel6/react-chessground";
import { memo, useMemo, useState, useCallback, useEffect } from "react";
import type {
  Dests,
  Key,
  ReactChessGroundProps,
} from "@bezalel6/react-chessground";
import type { Ban, Move, SimpleGameState, Square } from "@/lib/game-types";
import { getCurrentBan, parseFEN } from "@/lib/game-types";
import { getUserRole } from "@/lib/game-utils";
import { useAuth } from "@/components/AuthProvider";
import { BanChess } from "ban-chess.ts";

interface ChessBoardProps {
  gameState: SimpleGameState;
  game: BanChess | null;
  dests: Map<Square, Square[]>;
  activePlayer?: "white" | "black";
  actionType?: "ban" | "move";
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
}

// Helper function to get piece at a square from FEN position
function getPieceAt(fen: string, square: string): string | null {
  const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
  const rank = 8 - parseInt(square[1]); // 8=0, 7=1, etc.

  const rows = fen.split("/");
  const row = rows[rank];

  let col = 0;
  for (const char of row) {
    if (/\d/.test(char)) {
      col += parseInt(char);
    } else {
      if (col === file) {
        return char;
      }
      col++;
    }
  }
  return null;
}

const ChessBoard = memo(function ChessBoard({
  gameState,
  game,
  dests: propDests,
  activePlayer,
  actionType,
  onMove,
  onBan,
}: ChessBoardProps) {
  const { user } = useAuth();
  
  // Get user role (what color they're playing)
  const userRole = getUserRole(gameState, user?.userId);
  const { role, orientation } = userRole;
  
  // Get game state from BanChess instance
  const currentActivePlayer = activePlayer || game?.getActivePlayer() || "white";
  const currentAction = actionType || game?.getActionType() || "move";
  
  // Determine permissions based on BanChess state
  const isPlayer = role !== null;
  const isMyTurn = isPlayer && role === currentActivePlayer && !gameState?.gameOver;
  const canMove = isMyTurn && currentAction === "move";
  const canBan = isMyTurn && currentAction === "ban";
  const [_promotionMove, _setPromotionMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  
  // Debug panel freeze state - frozen by default
  const [frozen, setFrozen] = useState(true);
  const [frozenConfig, setFrozenConfig] = useState<Record<string, unknown> | null>(null);

  // Parse FEN data
  const fenData = useMemo(() => {
    if (!gameState?.fen) return null;
    return parseFEN(gameState.fen);
  }, [gameState?.fen]);

  // Determine which color pieces can be moved
  const movableColor = useMemo(() => {
    if (!canMove && !canBan) {
      return undefined;
    }
    if (role === null) {
      return undefined;
    }
    
    // During YOUR ban phase, allow selecting both colors
    // The dests map will restrict to only opponent pieces
    if (canBan && currentAction === "ban") {
      return "both";
    } else if (canMove && currentAction === "move") {
      // When moving, you select YOUR OWN pieces
      return role as "white" | "black";
    } else {
      // Not your turn - no pieces selectable
      return undefined;
    }
  }, [canMove, canBan, role, currentAction]);

  // Extract values - ban from FEN, action from context
  const currentBan = gameState ? getCurrentBan(gameState.fen) : null;
  const nextAction = currentAction; // From GameRoleContext which gets it from BanChess
  const isInCheck = false; // TODO: Get from BanChess instance if needed for UI
  
  // Delay ban visualization to avoid NaN errors when board is not ready
  const [visibleBan, setVisibleBan] = useState<typeof currentBan>(null);
  
  useEffect(() => {
    // Small delay to ensure board DOM elements are positioned
    if (currentBan) {
      const timer = setTimeout(() => {
        setVisibleBan(currentBan);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setVisibleBan(null);
    }
  }, [currentBan]);

  // Convert dests from Map<Square, Square[]> to Map<Key, Key[]> for chessground
  const dests: Dests = useMemo(() => {
    const destsMap = new Map<Key, Key[]>();
    
    // ONLY use provided dests - no fallbacks
    propDests.forEach((squares, from) => {
      destsMap.set(from as Key, squares as Key[]);
    });
    
    return destsMap;
  }, [propDests]);

  // Memoize the move handler
  const handleAfterMove = useCallback(
    (orig: string, dest: string) => {
      if (!gameState || !fenData) return;

      if (nextAction === "ban") {
        onBan({ from: orig, to: dest });
      } else {
        // Check if this is a pawn promotion
        const piece = getPieceAt(fenData.position, orig);
        const isPromotion = piece === "P" || piece === "p";
        const destRank = dest[1];

        if (isPromotion && (destRank === "8" || destRank === "1")) {
          // Store the move and show promotion dialog
          _setPromotionMove({ from: orig, to: dest });
        } else {
          onMove({
            from: orig,
            to: dest,
            promotion: undefined,
          });
        }
      }
    },
    [gameState, fenData, nextAction, onMove, onBan],
  );

  // More stable board key - only remount when position actually changes
  const boardKey = useMemo(
    () =>
      `${fenData?.position || "initial"}-${fenData?.turn || "w"}-${
        gameState?.gameOver ? "over" : "active"
      }`,
    [fenData?.position, fenData?.turn, gameState?.gameOver],
  );

  // Memoize config early to comply with Rules of Hooks
  const config: ReactChessGroundProps = useMemo(
    () => ({
      fen:
        gameState?.fen ||
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      orientation,
      coordinates: false,
      autoCastle: true,
      highlight: {
        lastMove: true,
      },
      check: isInCheck ? fenData?.turn : undefined,
      lastMove: undefined,
      animation: {
        enabled: true,
        duration: 200,
      },
      movable: {
        free: false,
        color: movableColor,
        dests: (canMove || canBan) ? dests : new Map(),
        showDests: true,
        rookCastle: false, // Disable castling during ban phase
        events: {
          after: handleAfterMove,
        },
      },
      selectable: {
        enabled: canMove || canBan,
      },
      premovable: {
        enabled: false,
      },
      drawable: {
        enabled: true,
        visible: true,
        autoShapes: visibleBan && visibleBan.from && visibleBan.to
          ? [
              {
                orig: visibleBan.from as Key,
                dest: visibleBan.to as Key,
                brush: "red",
              },
            ]
          : [],
      },
    }),
    [
      gameState?.fen,
      fenData,
      orientation,
      isInCheck,
      movableColor,
      canMove,
      canBan,
      dests,
      handleAfterMove,
      visibleBan,
    ],
  );

  // Safety check: If gameState or fenData is invalid, return a placeholder
  if (!gameState || !gameState.fen || !fenData) {
    return (
      <div className="chess-board-outer">
        <div className="chess-board-inner flex items-center justify-center">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  // Debug logging - commented out to reduce console spam
  // Uncomment when debugging is needed
  /*
  console.log("[ChessBoard] State:", {
    role,
    turn: fenData.turn,
    nextAction,
    orientation,
    movableColor,
    canMove,
    canBan,
    destsCount: dests.size,
    destsKeys: Array.from(dests.keys()),
    players: gameState.players,
    currentBan,
    banState: fenData.banState,
    isInCheck,
  });
  
  console.log("[ChessBoard] Movable config:", {
    color: movableColor,
    destsSize: dests.size,
    canMoveOrBan: canMove || canBan,
  });

  if (visibleBan) {
    console.log("[ChessBoard] BAN IS VISIBLE:", visibleBan);
  } else if (currentBan) {
    console.log("[ChessBoard] Ban pending visualization:", currentBan);
  } else {
    console.log("[ChessBoard] No ban to display");
  }
  */

  // Create the debug config object
  const debugConfig = {
    fen: config.fen,
    orientation: config.orientation,
    movable: {
      color: config.movable?.color,
      dests: config.movable?.dests ? Array.from(config.movable.dests.entries()).map(([k, v]) => [k, v]) : [],
    },
    drawable: config.drawable,
    check: config.check,
    lastMove: config.lastMove,
    gameState: {
      role,
      turn: fenData?.turn,
      activePlayer: currentActivePlayer,
      action: currentAction,
      canMove,
      canBan,
      visibleBan,
    }
  };

  // Capture config when freezing
  const handleFreeze = () => {
    if (!frozen) {
      // Freezing - capture current state
      setFrozenConfig(debugConfig);
    }
    setFrozen(!frozen);
  };

  // Use frozen config if frozen and available, otherwise live config
  const displayConfig = frozen && frozenConfig ? frozenConfig : debugConfig;

  return (
    <>
      <div className="chess-board-outer">
        <div className="chess-board-inner">
          <Chessground key={boardKey} {...config} />
        </div>
      </div>
      {/* Debug JSON Panel - At the very bottom of the page */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-green-400 max-h-48 overflow-y-auto z-40 border-t-2 border-gray-700">
        <details className="p-2">
          <summary className="cursor-pointer text-xs font-mono text-gray-400 hover:text-green-400 flex items-center justify-between">
            <span>Board Config JSON (click to expand)</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFreeze();
              }}
              className={`ml-2 px-2 py-1 text-xs rounded ${
                frozen 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-green-600 text-white'
              }`}
            >
              {frozen ? '❄️ Frozen' : '🔴 Live'}
            </button>
          </summary>
          <pre className="text-xs font-mono mt-2 whitespace-pre-wrap">
            {JSON.stringify(displayConfig, null, 2)}
          </pre>
        </details>
      </div>
    </>
  );
});

export default ChessBoard;
