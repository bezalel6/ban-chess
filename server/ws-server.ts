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
  
  // Check for game over and check state
  const isGameOver = room.game.gameOver();
  const isCheckmate = room.game.inCheckmate();
  const isStalemate = room.game.inStalemate();
  const isInCheck = room.game.inCheck();
  
  if (isGameOver) {
    console.log(`[broadcastGameState] GAME OVER in ${gameId}! Checkmate: ${isCheckmate}, Stalemate: ${isStalemate}`);
  }
  
  // Get legal moves/bans from the game
  const fen = room.game.fen();
  const fenParts = fen.split(' ');
  const chessTurn = fenParts[1] === 'w' ? 'white' : 'black';
  const banState = fenParts[6]; // 7th field contains ban state
  const isNextActionBan = banState && banState.includes(':ban');
  
  // Get legal actions and convert to simple format
  const legalActions = isNextActionBan ? room.game.legalBans() : room.game.legalMoves();
  console.log(`[broadcastGameState] FEN: ${fen}`);
  console.log(`[broadcastGameState] Chess turn: ${chessTurn}, Next action: ${isNextActionBan ? 'ban' : 'move'}, Legal actions count: ${legalActions.length}`);
  
  const simpleLegalActions = legalActions.map((action: string | { from: string; to: string }) => {
    if (typeof action === 'string') {
      return action; // Already in "e2e4" format
    } else if (action && typeof action === 'object' && 'from' in action && 'to' in action) {
      return action.from + action.to; // Convert {from: "e2", to: "e4"} to "e2e4"
    }
    return null;
  }).filter(Boolean);
  
  // For solo games, determine the acting player (who makes the decision)
  let actingPlayer: 'white' | 'black' = chessTurn;
  if (room.isSoloGame) {
    // Ban phase: The player who just moved (or black at start) bans opponent's next moves
    // Move phase: The current turn player moves
    if (isNextActionBan) {
      // At game start (white's turn, ban phase): BLACK bans white's moves
      // After white moves (black's turn, ban phase): WHITE bans black's moves
      // After black moves (white's turn, ban phase): BLACK bans white's moves
      // Pattern: In ban phase, the OTHER player (not current turn) is acting
      actingPlayer = chessTurn === 'white' ? 'black' : 'white';
    } else {
      // In move phase, the current turn player acts
      actingPlayer = chessTurn;
    }
  }
  
  console.log(`[broadcastGameState] Acting player: ${actingPlayer} (solo: ${room.isSoloGame})`);
  
  const stateMsg: SimpleServerMsg = {
    type: 'state',
    fen: fen,
    gameId,
    players: getPlayerUsernames(room),
    isSoloGame: room.isSoloGame,
    legalActions: simpleLegalActions,
    nextAction: isNextActionBan ? 'ban' : 'move',
    inCheck: isInCheck,
    // For solo games, playerColor is the acting player
    ...(room.isSoloGame && { playerColor: actingPlayer }),
    // Add game over state
    ...(isGameOver && { 
      gameOver: true,
      result: isCheckmate ? 
        `${chessTurn === 'white' ? 'Black' : 'White'} wins by checkmate!` : 
        isStalemate ? 'Draw by stalemate' : 'Game over'
    })
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
          
          // Handle duplicate connections gracefully by closing the old one silently
          const existingPlayer = Array.from(authenticatedPlayers.values()).find(p => p.userId === userId);
          if (existingPlayer && existingPlayer.ws !== ws) {
            console.log(`User ${username} establishing new connection, closing old one.`);
            existingPlayer.ws.close(1000, 'New connection established');
            authenticatedPlayers.delete(existingPlayer.ws);
            removeFromQueue(existingPlayer);
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
              let color: 'white' | 'black' = room.whitePlayerId === userId ? 'white' : 'black';
              
              // For solo games, determine the acting player
              if (room.isSoloGame) {
                const fen = room.game.fen();
                const fenParts = fen.split(' ');
                const chessTurn = fenParts[1] === 'w' ? 'white' : 'black';
                const banState = fenParts[6];
                const isNextActionBan = banState && banState.includes(':ban');
                
                // Same logic as broadcastGameState
                if (isNextActionBan) {
                  color = chessTurn === 'white' ? 'black' : 'white';
                } else {
                  color = chessTurn;
                }
              }
              
              ws.send(JSON.stringify({
                type: 'joined',
                gameId,
                color,
                players: getPlayerUsernames(room),
                isSoloGame: room.isSoloGame
              } as SimpleServerMsg));
              
              // Send game state immediately
              broadcastGameState(gameId);
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
          let color: 'white' | 'black' = room.whitePlayerId === currentPlayer.userId ? 'white' : 'black';
          
          // For solo games, determine the acting player
          if (room.isSoloGame) {
            const fen = room.game.fen();
            const fenParts = fen.split(' ');
            const chessTurn = fenParts[1] === 'w' ? 'white' : 'black';
            const banState = fenParts[6];
            const isNextActionBan = banState && banState.includes(':ban');
            
            // Same logic as broadcastGameState
            if (isNextActionBan) {
              color = chessTurn === 'white' ? 'black' : 'white';
            } else {
              color = chessTurn;
            }
          }
          
          ws.send(JSON.stringify({
            type: 'joined',
            gameId,
            color,
            players: getPlayerUsernames(room),
            isSoloGame: room.isSoloGame
          } as SimpleServerMsg));
          
          // Send game state immediately, not with a timeout
          broadcastGameState(gameId);
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
          
          // BanChess handles ALL validation
          const result = room.game.play(action);
          
          if (result.success) {
            console.log(`Action in game ${gameId}:`, action);
            // WORKAROUND: Re-create the game object from the new FEN.
            // This prevents potential stale state issues within the ban-chess.ts library.
            const newFen = room.game.fen();
            room.game = new BanChess(newFen);
            broadcastGameState(gameId);
          } else {
            console.log(`Invalid action in game ${gameId}:`, action, 'Error:', result.error);
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