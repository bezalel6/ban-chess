'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, Clock } from 'lucide-react';

interface LiveGame {
  id: string;
  whitePlayer: {
    username: string;
    rating: number;
  };
  blackPlayer: {
    username: string;
    rating: number;
  };
  timeControl: string;
  viewers: number;
  status: 'playing' | 'finished';
}

// Mock data for now - in real app this would come from WebSocket/API
const mockLiveGames: LiveGame[] = [
  {
    id: '1',
    whitePlayer: { username: 'ChessMaster', rating: 1850 },
    blackPlayer: { username: 'BanExpert', rating: 1920 },
    timeControl: '5+3',
    viewers: 12,
    status: 'playing'
  },
  {
    id: '2',
    whitePlayer: { username: 'TacticGuru', rating: 1720 },
    blackPlayer: { username: 'PositionKing', rating: 1680 },
    timeControl: '10+0',
    viewers: 8,
    status: 'playing'
  },
  {
    id: '3',
    whitePlayer: { username: 'StrategyBot', rating: 1950 },
    blackPlayer: { username: 'EndgameExpert', rating: 1890 },
    timeControl: '15+10',
    viewers: 5,
    status: 'playing'
  }
];

function GameCard({ game }: { game: LiveGame }) {
  return (
    <Link
      href={`/game/${game.id}`}
      className="block bg-background-tertiary hover:bg-background-secondary rounded-lg p-4 transition-colors border border-border"
    >
      <div className="space-y-3">
        {/* Players */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full border border-gray-300"></div>
              <span className="text-sm font-medium text-foreground truncate">
                {game.whitePlayer.username}
              </span>
            </div>
            <span className="text-xs text-foreground-muted">
              {game.whitePlayer.rating}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-800 rounded-full border border-gray-600"></div>
              <span className="text-sm font-medium text-foreground truncate">
                {game.blackPlayer.username}
              </span>
            </div>
            <span className="text-xs text-foreground-muted">
              {game.blackPlayer.rating}
            </span>
          </div>
        </div>

        {/* Game Info */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center space-x-1 text-xs text-foreground-muted">
            <Clock className="h-3 w-3" />
            <span>{game.timeControl}</span>
          </div>
          
          <div className="flex items-center space-x-1 text-xs text-foreground-muted">
            <Eye className="h-3 w-3" />
            <span>{game.viewers}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LiveGames() {
  const [games, setGames] = useState<LiveGame[]>([]);

  useEffect(() => {
    // Simulate loading live games
    setGames(mockLiveGames);
  }, []);

  return (
    <div className="bg-background-secondary rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-card-title font-semibold text-foreground">Live Games</h2>
        <Link
          href="/games"
          className="text-sm text-lichess-orange-500 hover:text-lichess-orange-400 transition-colors"
        >
          View all
        </Link>
      </div>
      
      <div className="space-y-3">
        {games.length > 0 ? (
          games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))
        ) : (
          <div className="text-center text-foreground-muted py-8">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm">No live games at the moment</p>
            <p className="text-xs mt-1">Start a game to see it here!</p>
          </div>
        )}
      </div>
    </div>
  );
}