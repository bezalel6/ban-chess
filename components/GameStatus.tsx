import type { SimpleGameState } from '@/lib/game-types';
import { parseFEN } from '@/lib/game-types';

interface GameStatusProps {
  gameState: SimpleGameState;
}

export default function GameStatus({ gameState }: GameStatusProps) {
  const { turn } = parseFEN(gameState.fen);

  const getStatusText = () => {
    const isMyTurn = gameState.isSoloGame || turn === gameState.playerColor;
    const actionType = gameState.nextAction;

    if (!gameState.playerColor && !gameState.isSoloGame) {
      return 'Spectating';
    }

    // Check for game over states
    if (gameState.gameOver) {
      if (gameState.result?.includes('checkmate')) {
        const winner = gameState.result.includes('White') ? 'white' : 'black';
        const didIWin = winner === gameState.playerColor;
        if (gameState.isSoloGame) {
          return `🎉 Checkmate! ${winner === 'white' ? 'White' : 'Black'} wins!`;
        }
        return didIWin ? '🎉 Checkmate! You won!' : '💀 Checkmate! You lost.';
      }
      if (gameState.result?.includes('stalemate')) {
        return "🤝 Stalemate - It's a draw!";
      }
      if (gameState.result?.includes('draw')) {
        return '🤝 Game drawn';
      }
      return gameState.result || 'Game Over';
    }

    if (gameState.isSoloGame) {
      const color = turn === 'white' ? 'White' : 'Black';
      if (actionType === 'ban') {
        return `Playing as ${color}: Ban one of ${
          turn === 'white' ? 'Black' : 'White'
        }'s moves`;
      } else {
        return `Playing as ${color}: Make a move`;
      }
    }

    // Game is still playing
    if (actionType === 'ban') {
      if (isMyTurn) {
        return `Your turn: Ban one of ${
          turn === 'white' ? 'Black' : 'White'
        }'s moves`;
      } else {
        return `Waiting for ${turn} to ban a move`;
      }
    } else {
      if (isMyTurn) {
        return 'Your turn: Make a move';
      } else {
        return `Waiting for ${turn} to move`;
      }
    }
  };

  const getMainStatus = () => {
    if (gameState.gameOver) {
      return gameState.result || 'Game Over';
    }
    return `${turn === 'white' ? 'White' : 'Black'} to ${gameState.nextAction || 'move'}`;
  };

  return (
    <div className='p-4 pb-3'>
      <div
        className={`text-lg font-semibold ${
          gameState.gameOver ? 'text-warning-500' : 'text-foreground'
        }`}
      >
        {getMainStatus()}
      </div>
      <div className='text-sm text-foreground-muted mt-1'>
        {getStatusText()}
      </div>
    </div>
  );
}
