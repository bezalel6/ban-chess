'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const [gameId, setGameId] = useState('');
  const router = useRouter();

  const createNewGame = () => {
    const newGameId = uuidv4();
    router.push(`/game/${newGameId}`);
  };

  const joinGame = () => {
    if (gameId.trim()) {
      router.push(`/game/${gameId.trim()}`);
    }
  };

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>♟️ Ban Chess Web</h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>
          Play Ban Chess online - a variant where you can ban your opponent's moves!
        </p>

        <div className="game-info" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '30px' }}>Start Playing</h2>
          
          <div style={{ marginBottom: '30px' }}>
            <button 
              onClick={createNewGame}
              style={{ 
                fontSize: '20px', 
                padding: '15px 30px',
                width: '100%',
                maxWidth: '300px'
              }}
            >
              Create New Game
            </button>
          </div>

          <div style={{ 
            borderTop: '1px solid #ddd', 
            margin: '30px 0', 
            paddingTop: '30px' 
          }}>
            <h3 style={{ marginBottom: '20px' }}>Or Join Existing Game</h3>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <input
                type="text"
                placeholder="Enter game ID"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') joinGame();
                }}
                style={{
                  padding: '10px',
                  fontSize: '16px',
                  border: '2px solid #ddd',
                  borderRadius: '5px',
                  flex: '1',
                  maxWidth: '300px'
                }}
              />
              <button onClick={joinGame} disabled={!gameId.trim()}>
                Join Game
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '40px', color: '#666' }}>
          <h3 style={{ marginBottom: '15px' }}>How to Play</h3>
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
    </div>
  );
}