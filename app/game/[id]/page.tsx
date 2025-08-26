import { Suspense } from 'react';
import GameClient from '@/components/GameClient';
import { getCurrentUser } from '@/lib/auth-unified';

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { id: gameId } = await params;
  const user = await getCurrentUser();

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    }>
      <GameClient gameId={gameId} user={user} />
    </Suspense>
  );
}