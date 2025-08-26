'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      // Clean up WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const joinQueue = () => {
    setInQueue(true);
    setError(null);
    
    const ws = new WebSocket('ws://localhost:8081');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join-queue' }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'queued') {
        setQueuePosition(msg.position);
      } else if (msg.type === 'matched') {
        // Store color in sessionStorage for the game page
        sessionStorage.setItem(`gameColor-${msg.gameId}`, msg.color);
        // Redirect to game
        router.push(`/game/${msg.gameId}`);
      } else if (msg.type === 'error') {
        setError(msg.message);
        setInQueue(false);
      }
    };

    ws.onerror = () => {
      setError('Connection failed');
      setInQueue(false);
    };

    ws.onclose = () => {
      setInQueue(false);
      setQueuePosition(null);
    };
  };

  const leaveQueue = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave-queue' }));
      wsRef.current.close();
    }
    setInQueue(false);
    setQueuePosition(null);
  };

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>♟️ Ban Chess Web</h1>
        <p style={{ fontSize: '18px', color: '#a0a0a0', marginBottom: '40px' }}>
          Play Ban Chess online - a variant where you can ban your opponent's moves!
        </p>

        <div className="game-info" style={{ maxWidth: '500px', margin: '0 auto' }}>
          {!inQueue ? (
            <>
              <h2 style={{ marginBottom: '30px', color: '#f0f0f0' }}>Ready to Play?</h2>
              <button 
                onClick={joinQueue}
                style={{ 
                  fontSize: '24px', 
                  padding: '20px 40px',
                  width: '100%',
                  maxWidth: '300px'
                }}
              >
                Join Queue
              </button>
            </>
          ) : (
            <>
              <h2 style={{ marginBottom: '30px', color: '#f0f0f0' }}>Finding Opponent...</h2>
              <div style={{ marginBottom: '30px' }}>
                <div className="loading-spinner" />
                {queuePosition && (
                  <p style={{ fontSize: '18px', marginTop: '20px' }}>
                    Position in queue: {queuePosition}
                  </p>
                )}
              </div>
              <button 
                onClick={leaveQueue}
                style={{ 
                  background: '#f44336',
                  fontSize: '18px',
                  padding: '10px 20px'
                }}
              >
                Leave Queue
              </button>
            </>
          )}
          
          {error && (
            <div className="error" style={{ marginTop: '20px' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ marginTop: '60px', color: '#b0b0b0' }}>
          <h3 style={{ marginBottom: '15px', color: '#f0f0f0' }}>How to Play Ban Chess</h3>
          <ol style={{ 
            textAlign: 'left', 
            maxWidth: '600px', 
            margin: '0 auto',
            lineHeight: '1.8'
          }}>
            <li>Black bans one of White's opening moves</li>
            <li>White makes their first move (with the ban in effect)</li>
            <li>White bans one of Black's possible responses</li>
            <li>Black makes their move (with the ban in effect)</li>
            <li>Pattern continues: Ban → Move → Ban → Move...</li>
            <li>Win by checkmating your opponent!</li>
          </ol>
        </div>
      </div>

      <style jsx>{`
        .loading-spinner {
          border: 4px solid #333;
          border-top: 4px solid #4CAF50;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}