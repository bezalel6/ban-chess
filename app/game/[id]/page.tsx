import { Suspense } from 'react';
import GameClient from '@/components/GameClient';

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { id: gameId } = await params;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    }>
      <GameClient gameId={gameId} />
    </Suspense>
  );
}