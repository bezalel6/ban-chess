import type { GameState } from '@/lib/game-types';

interface GameStatusProps {
  gameState: GameState;
}

export default function GameStatus({ gameState }: GameStatusProps) {
  const getStatusText = () => {
    const isMyTurn = gameState.isSoloGame || gameState.turn === gameState.playerColor;
    const actionType = gameState.nextAction;

    if (!gameState.playerColor && !gameState.isSoloGame) {
      return "Spectating";
    }
    
    if (gameState.isSoloGame && gameState.status === 'playing') {
      const color = gameState.turn === 'white' ? 'White' : 'Black';
      if (actionType === "ban") {
        return `Playing as ${color}: Ban one of ${
          gameState.turn === "white" ? "Black" : "White"
        }'s moves`;
      } else {
        return `Playing as ${color}: Make a move`;
      }
    }

    // Check for game over states
    if (gameState.status === 'checkmate') {
      const didIWin = gameState.winner === gameState.playerColor;
      if (didIWin) {
        return "🎉 Checkmate! You won!";
      } else {
        return "💀 Checkmate! You lost.";
      }
    }
    
    if (gameState.status === 'stalemate') {
      return "🤝 Stalemate - It's a draw!";
    }
    
    if (gameState.status === 'draw') {
      return "🤝 Game drawn";
    }

    // Game is still playing
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

  const getMainStatus = () => {
    if (gameState.status === 'checkmate') {
      return `Checkmate! ${gameState.winner === 'white' ? 'White' : 'Black'} wins`;
    }
    if (gameState.status === 'stalemate') {
      return 'Stalemate';
    }
    if (gameState.status === 'draw') {
      return 'Draw';
    }
    return `${gameState.turn === "white" ? "White" : "Black"} to ${gameState.nextAction}`;
  };

  return (
    <div className="p-4 pb-3">
      <div className={`text-lg font-semibold ${
        gameState.status !== 'playing' ? 'text-warning-500' : 'text-foreground'
      }`}>
        {getMainStatus()}
      </div>
      <div className="text-sm text-foreground-muted mt-1">
        {getStatusText()}
      </div>
    </div>
  );
}