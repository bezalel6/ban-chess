import { WebSocketServer, WebSocket } from 'ws';
import { BanChess } from 'ban-chess.ts';
import type { SimpleServerMsg, SimpleClientMsg } from '../lib/game-types';
import { v4 as uuidv4 } from 'uuid';

interface Player {
  userId: string;
  username: string;
  ws: WebSocket;
}

interface GameRoom {
  game: BanChess;
  whitePlayerId?: string;
  blackPlayerId?: string;
  isSoloGame?: boolean;
}

const wss = new WebSocketServer({ port: 8081 });
const games = new Map<string, GameRoom>();
const queue: Player[] = [];
const authenticatedPlayers = new Map<WebSocket, Player>();
const playerToGame = new Map<string, string>(); // userId -> gameId

console.log('WebSocket server (simplified) started on ws://localhost:8081');

function getPlayerUsernames(room: GameRoom): { white?: string; black?: string } {
  const usernames: { white?: string; black?: string } = {};
  
  if (room.whitePlayerId) {
    const whitePlayer = Array.from(authenticatedPlayers.values()).find(
      p => p.userId === room.whitePlayerId
    );
    if (whitePlayer) usernames.white = whitePlayer.username;
  }
  
  if (room.blackPlayerId) {
    const blackPlayer = Array.from(authenticatedPlayers.values()).find(
      p => p.userId === room.blackPlayerId
    );
    if (blackPlayer) {
      usernames.black = blackPlayer.username;
      // For solo games, both names are the same
      if (room.isSoloGame && room.whitePlayerId === room.blackPlayerId) {
        usernames.white = blackPlayer.username;
      }
    }
  }
  
  return usernames;
}

function broadcastGameState(gameId: string) {
  const room = games.get(gameId);
  if (!room) return;
  
  const stateMsg: SimpleServerMsg = {
    type: 'state',
    fen: room.game.fen(), // This includes the ban state!
    gameId,
    players: getPlayerUsernames(room),
    isSoloGame: room.isSoloGame
  };
  
  // Send to all players in the room
  const playerIds = [room.whitePlayerId, room.blackPlayerId].filter(Boolean);
  playerIds.forEach(playerId => {
    const player = Array.from(authenticatedPlayers.values()).find(p => p.userId === playerId);
    if (player && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(stateMsg));
    }
  });
}

function matchPlayers() {
  if (queue.length >= 2) {
    const player1 = queue.shift()!;
    const player2 = queue.shift()!;
    const gameId = uuidv4();
    
    const room: GameRoom = {
      game: new BanChess(),
      whitePlayerId: player1.userId,
      blackPlayerId: player2.userId,
      isSoloGame: false
    };
    
    games.set(gameId, room);
    playerToGame.set(player1.userId, gameId);
    playerToGame.set(player2.userId, gameId);
    
    // Send match notifications
    if (player1.ws.readyState === WebSocket.OPEN) {
      player1.ws.send(JSON.stringify({
        type: 'matched',
        gameId,
        color: 'white',
        opponent: player2.username
      } as SimpleServerMsg));
    }
    
    if (player2.ws.readyState === WebSocket.OPEN) {
      player2.ws.send(JSON.stringify({
        type: 'matched',
        gameId,
        color: 'black',
        opponent: player1.username
      } as SimpleServerMsg));
    }
    
    console.log(`Matched ${player1.username} vs ${player2.username} in game ${gameId}`);
    updateQueuePositions();
  }
}

function updateQueuePositions() {
  queue.forEach((player, index) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({
        type: 'queued',
        position: index + 1
      } as SimpleServerMsg));
    }
  });
}

function removeFromQueue(player: Player) {
  const index = queue.findIndex(p => p.userId === player.userId);
  if (index > -1) {
    queue.splice(index, 1);
    updateQueuePositions();
  }
}

wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');
  let currentPlayer: Player | null = null;
  
  ws.on('message', (data: Buffer) => {
    try {
      const msg: SimpleClientMsg = JSON.parse(data.toString());
      console.log('Received message:', msg.type);
      
      switch (msg.type) {
        case 'authenticate': {
          const { userId, username } = msg;
          
          // Handle duplicate connections with session takeover
          const existingPlayer = Array.from(authenticatedPlayers.values()).find(p => p.userId === userId);
          if (existingPlayer && existingPlayer.ws !== ws) {
            if (existingPlayer.ws.readyState === WebSocket.OPEN) {
              console.log(`User ${username} taking over existing session`);
              existingPlayer.ws.send(JSON.stringify({
                type: 'error',
                message: 'Your session has been taken over by another connection'
              } as SimpleServerMsg));
              existingPlayer.ws.close(1000, 'Session takeover');
              authenticatedPlayers.delete(existingPlayer.ws);
              removeFromQueue(existingPlayer);
            } else {
              authenticatedPlayers.delete(existingPlayer.ws);
            }
          }
          
          currentPlayer = { userId, username, ws };
          authenticatedPlayers.set(ws, currentPlayer);
          console.log(`Player authenticated: ${username}`);
          
          ws.send(JSON.stringify({
            type: 'authenticated',
            userId,
            username
          } as SimpleServerMsg));
          
          // Check if player was in a game (reconnection)
          const gameId = playerToGame.get(userId);
          if (gameId) {
            const room = games.get(gameId);
            if (room) {
              const color = room.whitePlayerId === userId ? 'white' : 'black';
              ws.send(JSON.stringify({
                type: 'joined',
                gameId,
                color: room.isSoloGame ? 'white' : color, // Solo games always view as white
                players: getPlayerUsernames(room),
                isSoloGame: room.isSoloGame
              } as SimpleServerMsg));
              
              setTimeout(() => broadcastGameState(gameId), 50);
              console.log(`Player ${username} reconnected to game ${gameId}`);
            }
          }
          break;
        }
        
        case 'create-solo-game': {
          if (!currentPlayer) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' } as SimpleServerMsg));
            return;
          }
          
          const gameId = uuidv4();
          const room: GameRoom = {
            game: new BanChess(),
            whitePlayerId: currentPlayer.userId,
            blackPlayerId: currentPlayer.userId,
            isSoloGame: true
          };
          
          games.set(gameId, room);
          playerToGame.set(currentPlayer.userId, gameId);
          
          ws.send(JSON.stringify({ type: 'solo-game-created', gameId } as SimpleServerMsg));
          console.log(`Solo game ${gameId} created for ${currentPlayer.username}`);
          break;
        }
        
        case 'join-game': {
          if (!currentPlayer) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' } as SimpleServerMsg));
            return;
          }
          
          const { gameId } = msg;
          const room = games.get(gameId);
          
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game not found' } as SimpleServerMsg));
            return;
          }
          
          playerToGame.set(currentPlayer.userId, gameId);
          const color = room.whitePlayerId === currentPlayer.userId ? 'white' : 'black';
          
          ws.send(JSON.stringify({
            type: 'joined',
            gameId,
            color: room.isSoloGame ? 'white' : color,
            players: getPlayerUsernames(room),
            isSoloGame: room.isSoloGame
          } as SimpleServerMsg));
          
          setTimeout(() => broadcastGameState(gameId), 50);
          break;
        }
        
        case 'action': {
          if (!currentPlayer) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' } as SimpleServerMsg));
            return;
          }
          
          const { gameId, action } = msg;
          const room = games.get(gameId);
          
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game not found' } as SimpleServerMsg));
            return;
          }
          
          // In solo games, allow any action. Otherwise check turn
          if (!room.isSoloGame) {
            const playerColor = room.whitePlayerId === currentPlayer.userId ? 'white' : 'black';
            const gameTurn = room.game.turn === 'white' ? 'white' : 'black';
            if (playerColor !== gameTurn) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' } as SimpleServerMsg));
              return;
            }
          }
          
          // Let ban-chess.ts handle all validation
          const result = room.game.play(action);
          
          if (result.success) {
            console.log(`Action in game ${gameId}:`, action);
            broadcastGameState(gameId);
          } else {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: result.error || 'Invalid action' 
            } as SimpleServerMsg));
          }
          break;
        }
        
        case 'join-queue': {
          if (!currentPlayer) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' } as SimpleServerMsg));
            return;
          }
          
          const inQueue = queue.some(p => p.userId === currentPlayer!.userId);
          if (!inQueue) {
            queue.push(currentPlayer);
            console.log(`${currentPlayer.username} joined queue (position ${queue.length})`);
            updateQueuePositions();
            matchPlayers();
          }
          break;
        }
        
        case 'leave-queue': {
          if (currentPlayer) {
            removeFromQueue(currentPlayer);
            console.log(`${currentPlayer.username} left queue`);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Server error' 
      } as SimpleServerMsg));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentPlayer) {
      authenticatedPlayers.delete(ws);
      removeFromQueue(currentPlayer);
      
      const gameId = playerToGame.get(currentPlayer.userId);
      if (gameId) {
        console.log(`Player ${currentPlayer.username} disconnected from game ${gameId}`);
      }
    }
  });
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`\n[WebSocket] Received ${signal}, shutting down gracefully...`);
  
  wss.clients.forEach((ws) => {
    ws.close(1000, 'Server shutting down');
  });
  
  wss.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));