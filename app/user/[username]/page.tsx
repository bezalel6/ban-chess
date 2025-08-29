import { Trophy, Clock, TrendingUp, Shield, User, ChevronRight } from 'lucide-react';
import { createAuthenticatedComponent } from '@/components/auth/withAuth';
import type { AuthSession } from '@/types/auth';

interface GameRecord {
  id: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  playerColor: 'white' | 'black';
  duration: string;
  date: string;
}

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
  session?: AuthSession;
}

async function AuthenticatedUserProfile({ params, session }: UserProfilePageProps) {
  const resolvedParams = await params;
  const username = resolvedParams.username;
  const user = session?.user;
  
  // Guest users don't have profiles
  const isGuest = user?.provider === 'guest';
  const isOwnProfile = user?.username === username && !isGuest;
  
  // Mock data - in production this would come from an API
  const stats = {
    rating: 1524,
    gamesPlayed: 127,
    wins: 68,
    losses: 45,
    draws: 14,
    winRate: Math.round((68 / 127) * 100),
    currentStreak: 3,
  };

  // Mock data - in production this would come from an API
  const recentGames: GameRecord[] = [
    {
      id: '1',
      opponent: 'DragonMaster',
      result: 'win',
      playerColor: 'white',
      duration: '15:23',
      date: '2 hours ago',
    },
    {
      id: '2',
      opponent: 'ChessWizard99',
      result: 'loss',
      playerColor: 'black',
      duration: '08:45',
      date: '5 hours ago',
    },
    {
      id: '3',
      opponent: 'TacticalGenius',
      result: 'draw',
      playerColor: 'white',
      duration: '22:10',
      date: 'Yesterday',
    },
  ];

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-500';
      case 'loss': return 'text-red-500';
      case 'draw': return 'text-yellow-500';
      default: return 'text-foreground';
    }
  };

  const getResultSymbol = (result: string) => {
    switch (result) {
      case 'win': return '+1';
      case 'loss': return '-1';
      case 'draw': return '½';
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Clean Profile Header */}
      <div className="bg-background-secondary rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-lichess-orange-400 to-lichess-orange-600 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {username}
                {stats.rating >= 1500 && (
                  <span title="Established Player">
                    <Shield className="h-5 w-5 text-lichess-orange-500" />
                  </span>
                )}
              </h1>
              <p className="text-sm text-foreground-muted">
                Rating: <span className="font-semibold">{stats.rating}</span>
              </p>
            </div>
          </div>
          {isOwnProfile && (
            <button className="px-4 py-2 text-sm bg-background hover:bg-background-tertiary rounded-lg transition-colors">
              Edit Profile
            </button>
          )}
        </div>

        {/* Simplified Stats Grid */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{stats.gamesPlayed}</div>
            <div className="text-xs text-foreground-muted">Games</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500">{stats.wins}</div>
            <div className="text-xs text-foreground-muted">Wins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{stats.losses}</div>
            <div className="text-xs text-foreground-muted">Losses</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-lichess-orange-500">{stats.winRate}%</div>
            <div className="text-xs text-foreground-muted">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Recent Games - Clean List */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-lichess-orange-500" />
          Recent Games
        </h2>
        
        <div className="space-y-2">
          {recentGames.map((game) => (
            <div
              key={game.id}
              className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded ${
                  game.playerColor === 'white' ? 'bg-white border' : 'bg-gray-700'
                }`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">vs {game.opponent}</span>
                    <span className={`font-bold ${getResultColor(game.result)}`}>
                      {getResultSymbol(game.result)}
                    </span>
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {game.duration} • {game.date}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-foreground-muted" />
            </div>
          ))}
        </div>

        <button className="w-full mt-4 py-2 text-sm text-lichess-orange-500 hover:text-lichess-orange-400 transition-colors">
          View all games
        </button>
      </div>

      {/* Current Performance */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-lichess-orange-500" />
          Current Performance
        </h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-foreground-muted mb-2">Win Streak</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-500">{stats.currentStreak}</span>
              <span className="text-sm text-foreground-muted">games</span>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-foreground-muted mb-2">Rating Trend</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-lichess-orange-500">↑</span>
              <span className="text-sm text-foreground-muted">Improving</span>
            </div>
          </div>
        </div>

        {/* Simple Win Rate Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-foreground-muted">Win Rate</span>
            <span className="font-medium">{stats.winRate}%</span>
          </div>
          <div className="bg-background-tertiary rounded-full h-3">
            <div
              className="bg-gradient-to-r from-lichess-orange-400 to-lichess-orange-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.winRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="bg-background-secondary rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-lichess-orange-500" />
          Achievements
        </h2>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-4 bg-background-tertiary rounded-lg">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-xs font-medium">First Win</p>
          </div>
          <div className="text-center p-4 bg-background-tertiary rounded-lg">
            <Shield className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-xs font-medium">100 Games</p>
          </div>
          <div className="text-center p-4 bg-background-tertiary rounded-lg">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-xs font-medium">Rising Star</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Unauthenticated version - still shows public profile
function PublicUserProfile({ params }: UserProfilePageProps) {
  const username = params.username;
  
  // Don't show profiles for guest usernames
  if (username.toLowerCase().startsWith('guest')) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-secondary rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Guest Profile</h1>
          <p className="text-foreground-muted mb-6">
            Guest accounts don&apos;t have profiles. Sign in with Lichess or Google to track your games and stats!
          </p>
          <a
            href="/auth/signin"
            className="inline-block px-6 py-2 bg-lichess-orange-500 text-white rounded-lg hover:bg-lichess-orange-600 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }
  
  // Show public profile data for non-authenticated viewers
  // Same layout but without edit options
  return <AuthenticatedUserProfile params={params} session={undefined} />;
}

// Export using the conditional component that shows different content based on auth state
export default createAuthenticatedComponent(
  AuthenticatedUserProfile,
  PublicUserProfile,
  { allowGuest: true } // Allow guests to view profiles
);