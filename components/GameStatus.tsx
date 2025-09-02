import type { SimpleGameState } from "@/lib/game-types";
import { parseFEN } from "@/lib/game-types";
import { useAuth } from "@/components/AuthProvider";
import { BanChess } from "ban-chess.ts";

interface GameStatusProps {
  gameState: SimpleGameState;
}

export default function GameStatus({ gameState }: GameStatusProps) {
  const { user } = useAuth();
  const { turn } = parseFEN(gameState.fen);

  // Create BanChess instance to get action type
  let game: BanChess | null = null;
  let actionType: "ban" | "move" = "move";
  try {
    game = new BanChess(gameState.fen);
    actionType = game.nextActionType();
  } catch (e) {
    console.error("Error creating BanChess instance:", e);
  }

  // Determine player's role
  const getPlayerRole = (): "spectator" | "white" | "black" => {
    if (!user?.userId) return "spectator";
    if (gameState.players.white?.id === user.userId) return "white";
    if (gameState.players.black?.id === user.userId) return "black";
    return "spectator";
  };

  const playerRole = getPlayerRole();
  const isPlayer = playerRole !== "spectator";
  const isMyTurn = isPlayer && turn === playerRole;

  const getStatusText = () => {

    // Check for game over states first
    if (gameState.gameOver) {
      if (gameState.result?.includes("checkmate")) {
        const winner = gameState.result.includes("White") ? "white" : "black";
        if (playerRole === "spectator") {
          return `🎉 Checkmate! ${winner === "white" ? "White" : "Black"} wins!`;
        }
        const didIWin = winner === playerRole;
        return didIWin ? "🎉 Checkmate! You won!" : "💀 Checkmate! You lost.";
      }
      if (gameState.result?.includes("stalemate")) {
        return "🤝 Stalemate - It's a draw!";
      }
      if (gameState.result?.includes("draw")) {
        return "🤝 Game drawn";
      }
      return gameState.result || "Game Over";
    }

    // Handle spectators
    if (playerRole === "spectator") {
      const color = turn === "white" ? "White" : "Black";
      if (actionType === "ban") {
        return `${color} to ban one of ${
          turn === "white" ? "Black" : "White"
        }'s moves`;
      } else {
        return `${color} to move`;
      }
    }

    // Handle players (game is still playing)
    if (actionType === "ban") {
      if (isMyTurn) {
        return `Your turn: Ban one of ${
          turn === "white" ? "Black" : "White"
        }'s moves`;
      } else {
        const playerName =
          turn === "white"
            ? gameState.players.white?.username || "White"
            : gameState.players.black?.username || "Black";
        return `Waiting for ${playerName} to ban a move`;
      }
    } else {
      if (isMyTurn) {
        return "Your turn: Make a move";
      } else {
        const playerName =
          turn === "white"
            ? gameState.players.white?.username || "White"
            : gameState.players.black?.username || "Black";
        return `Waiting for ${playerName} to move`;
      }
    }
  };

  const getMainStatus = () => {
    if (gameState.gameOver) {
      return gameState.result || "Game Over";
    }
    return `${turn === "white" ? "White" : "Black"} to ${actionType}`;
  };

  return (
    <div className="p-4 pb-3">
      <div
        className={`text-lg font-semibold ${
          gameState.gameOver ? "text-warning-500" : "text-foreground"
        }`}
      >
        {getMainStatus()}
      </div>
      <div className="text-sm text-foreground-muted mt-1">
        {getStatusText()}
      </div>
    </div>
  );
}
