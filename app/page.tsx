'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function HomePage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Authenticate
      socket.send(JSON.stringify({
        type: 'authenticate',
        userId: user.userId,
        username: user.username
      }));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      switch (msg.type) {
        case 'solo-game-created':
          // Redirect to solo game
          router.push(`/game/${msg.gameId}`);
          break;
          
        case 'matched':
          // Matched with another player
          router.push(`/game/${msg.gameId}`);
          break;
          
        case 'queued':
          // Update queue position
          setQueuePosition(msg.position);
          break;
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [user, router]);

  const createSoloGame = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('Not connected to server. Please refresh and try again.');
      return;
    }
    ws.send(JSON.stringify({ type: 'create-solo-game' }));
  };

  const joinQueue = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert('Not connected to server. Please refresh and try again.');
      return;
    }
    setInQueue(true);
    ws.send(JSON.stringify({ type: 'join-queue' }));
  };

  const leaveQueue = () => {
    if (!ws) return;
    setInQueue(false);
    setQueuePosition(0);
    ws.send(JSON.stringify({ type: 'leave-queue' }));
  };

  const joinGame = () => {
    const gameId = prompt('Enter Game ID:');
    if (gameId) {
      router.push(`/game/${gameId}`);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">2 Ban 2 Chess</h1>
          <p className="text-foreground-muted mb-8">Chess where you can ban opponent moves</p>
          <a href="/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
            Sign in to play
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">2 Ban 2 Chess</h1>
        <p className="text-foreground-muted">Playing as {user.username}</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={createSoloGame}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
        >
          Play Solo (Practice)
        </button>

        {!inQueue ? (
          <button
            onClick={joinQueue}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            Find Opponent
          </button>
        ) : (
          <div className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg text-center">
            <p>In queue...</p>
            {queuePosition > 0 && <p className="text-sm">Position: {queuePosition}</p>}
            <button 
              onClick={leaveQueue}
              className="text-sm underline mt-2"
            >
              Cancel
            </button>
          </div>
        )}

        <button
          onClick={joinGame}
          className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition"
        >
          Join with Game ID
        </button>
      </div>
    </div>
  );
}