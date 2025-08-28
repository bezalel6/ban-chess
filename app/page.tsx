import { Suspense } from 'react';
import QuickPairing from '@/components/home/QuickPairing';
import LiveGames from '@/components/home/LiveGames';
import GameModeGrid from '@/components/home/GameModeGrid';

function QuickPairingSkeleton() {
  return (
    <div className="bg-background-secondary rounded-lg p-6 animate-pulse">
      <div className="h-6 bg-background-tertiary rounded mb-6 w-1/3"></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-background-tertiary rounded-lg"></div>
        ))}
      </div>
      <div className="h-12 bg-background-tertiary rounded-lg"></div>
    </div>
  );
}

function LiveGamesSkeleton() {
  return (
    <div className="bg-background-secondary rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-background-tertiary rounded w-1/3"></div>
        <div className="h-4 bg-background-tertiary rounded w-16"></div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-background-tertiary rounded-lg"></div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-background to-background-secondary py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Quick Pairing - Main CTA */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <div className="text-6xl mb-4">♟️</div>
                <h1 className="text-hero font-bold text-foreground mb-6">
                  Play Ban Chess Online
                </h1>
                <p className="text-lg text-foreground-muted mb-8 max-w-2xl">
                  A strategic chess variant where you can ban your opponent&apos;s moves. 
                  Test your tactical skills in this unique chess experience.
                </p>
              </div>
              
              <Suspense fallback={<QuickPairingSkeleton />}>
                <QuickPairing />
              </Suspense>
            </div>

            {/* Live Games Sidebar */}
            <div>
              <Suspense fallback={<LiveGamesSkeleton />}>
                <LiveGames />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-section font-bold text-foreground mb-8 text-center">
            Choose Your Game Mode
          </h2>
          <GameModeGrid />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-section font-bold text-foreground mb-8">
              Why Ban Chess?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl mb-4">🧠</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Strategic Depth</h3>
                <p className="text-foreground-muted">
                  Banning opponent moves adds a new layer of strategy and planning
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Fast-Paced</h3>
                <p className="text-foreground-muted">
                  Quick games with time controls from 1 minute to classical formats
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🌐</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Free & Open</h3>
                <p className="text-foreground-muted">
                  Completely free to play with open source development
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}