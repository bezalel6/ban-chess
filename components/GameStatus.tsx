import type { GameState } from '@/lib/game-types';

interface GameStatusProps {
  gameState: GameState;
}

export default function GameStatus({ gameState }: GameStatusProps) {
  const getStatusText = () => {
    const isMyTurn = gameState.turn === gameState.playerColor;
    const actionType = gameState.nextAction;

    if (!gameState.playerColor) {
      return "Spectating";
    }

    if (actionType === "ban") {
      if (isMyTurn) {
        return `Your turn: Ban one of ${
          gameState.turn === "white" ? "Black" : "White"
        }'s moves`;
      } else {
        return `Waiting for ${gameState.turn} to ban a move`;
      }
    } else {
      if (isMyTurn) {
        return "Your turn: Make a move";
      } else {
        return `Waiting for ${gameState.turn} to move`;
      }
    }
  };

  return (
    <div className="p-4 pb-3">
      <div className="text-lg font-semibold text-white">
        {gameState.turn === "white" ? "White" : "Black"} to {gameState.nextAction}
      </div>
      <div className="text-sm text-gray-400 mt-1">
        {getStatusText()}
      </div>
    </div>
  );
}