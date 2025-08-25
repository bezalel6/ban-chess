'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useWebSocket } from '@/lib/ws-client';

const ChessBoard = dynamic(() => import('@/components/ChessBoard'), {
  ssr: false,
});

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;
  const { gameState, error, connected, sendMove, sendBan } = useWebSocket(gameId);
  const [copied, setCopied] = useState(false);

  const copyGameLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected) {
    return (
      <div className="container">
        <div className="game-info" style={{ textAlign: 'center' }}>
          <h2>Connecting to game server...</h2>
          <p>Please wait while we establish a connection.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="container">
        <div className="game-info" style={{ textAlign: 'center' }}>
          <h2>Loading game...</h2>
        </div>
      </div>
    );
  }

  const getStatusText = () => {
    const isMyTurn = gameState.turn === gameState.playerColor;
    const actionType = gameState.nextAction;
    
    if (!gameState.playerColor) {
      return 'Spectating';
    }

    if (actionType === 'ban') {
      if (isMyTurn) {
        return `Your turn: Ban one of ${gameState.turn === 'white' ? 'Black' : 'White'}'s moves`;
      } else {
        return `Waiting for ${gameState.turn} to ban a move`;
      }
    } else {
      if (isMyTurn) {
        return 'Your turn: Make a move';
      } else {
        return `Waiting for ${gameState.turn} to move`;
      }
    }
  };

  const getTurnIndicator = () => {
    const currentPlayer = gameState.turn;
    const nextAction = gameState.nextAction;
    
    return (
      <div style={{ marginBottom: '15px' }}>
        <span style={{ 
          display: 'inline-block',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: currentPlayer === 'white' ? '#fff' : '#333',
          border: '2px solid #666',
          marginRight: '10px',
          verticalAlign: 'middle'
        }} />
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
          {currentPlayer === 'white' ? 'White' : 'Black'} to {nextAction}
        </span>
      </div>
    );
  };

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1>♟️ Ban Chess</h1>
        <p style={{ color: '#666' }}>Game ID: {gameId}</p>
        <button 
          onClick={copyGameLink}
          style={{ 
            fontSize: '14px', 
            padding: '5px 15px',
            marginTop: '10px',
            background: copied ? '#4CAF50' : '#2196F3'
          }}
        >
          {copied ? 'Link Copied!' : 'Copy Game Link'}
        </button>
      </div>

      <div className="game-info">
        {getTurnIndicator()}
        <div className="status">{getStatusText()}</div>
        
        {gameState.playerColor && (
          <div style={{ marginTop: '10px', color: '#666' }}>
            You are playing as: <strong>{gameState.playerColor}</strong>
          </div>
        )}

        <div style={{ marginTop: '15px' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Game History ({gameState.history.length} actions)
            </summary>
            <div style={{ 
              marginTop: '10px', 
              maxHeight: '200px', 
              overflowY: 'auto',
              padding: '10px',
              background: '#f5f5f5',
              borderRadius: '5px'
            }}>
              {gameState.history.length === 0 ? (
                <p>No moves yet</p>
              ) : (
                gameState.history.map((entry, idx) => (
                  <div key={idx} style={{ marginBottom: '5px' }}>
                    {entry.turnNumber}. {entry.player}: 
                    {entry.actionType === 'ban' ? (
                      <span> banned {entry.action.from}-{entry.action.to}</span>
                    ) : (
                      <span> {entry.san || `${entry.action.from}-${entry.action.to}`}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      </div>

      <ChessBoard 
        gameState={gameState}
        onMove={sendMove}
        onBan={sendBan}
        playerColor={gameState.playerColor}
      />

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          {gameState.nextAction === 'ban' 
            ? 'Click on an opponent piece, then click its destination to ban that move'
            : 'Click on your piece, then click its destination to move'}
        </p>
      </div>
    </div>
  );
}