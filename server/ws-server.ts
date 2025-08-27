import { WebSocketServer, WebSocket } from 'ws';
import { BanChess } from 'ban-chess.ts';
import { v4 as uuidv4 } from 'uuid';
import type { ClientMsg, ServerMsg } from '../lib/game-types';

interface Player {
  userId: string;
  username: string;
  ws: WebSocket;
}

interface GameRoom {
  game: BanChess;
  players: Map<string, { color: 'white' | 'black'; username: string }>; // userId -> player info
  whitePlayerId?: string;
  blackPlayerId?: string;
  isSoloGame?: boolean; // New flag for solo games
}

const wss = new WebSocketServer({ port: 8081 });
const games = new Map<string, GameRoom>();
const queue: Player[] = [];
const authenticatedPlayers = new Map<WebSocket, Player>(); // ws -> Player
const playerToGame = new Map<string, string>(); // userId -> gameId

console.log('WebSocket server started on ws://localhost:8081');

function broadcastToRoom(gameId: string, msg: ServerMsg) {
  const room = games.get(gameId);
  if (!room) return;

  const msgStr = JSON.stringify(msg);
  
  // Send to all authenticated players in the room
  room.players.forEach((playerInfo, userId) => {
    // Find the player's current WebSocket connection
    const player = Array.from(authenticatedPlayers.values()).find(p => p.userId === userId);
    if (player && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(msgStr);
    }
  });
}

function getPlayerUsernames(room: GameRoom): { white?: string; black?: string } {
  const usernames: { white?: string; black?: string } = {};
  
  if (room.whitePlayerId) {
    const whitePlayer = room.players.get(room.whitePlayerId);
    if (whitePlayer) usernames.white = whitePlayer.username;
  }
  
  if (room.blackPlayerId) {
    const blackPlayer = room.players.get(room.blackPlayerId);
    if (blackPlayer) {
      usernames.black = blackPlayer.username;
      
      // For solo games, if it's the same player controlling both colors,
      // ensure both white and black names are set
      if (room.isSoloGame && room.whitePlayerId === room.blackPlayerId) {
        usernames.white = blackPlayer.username;
      }
    }
  }
  
  return usernames;
}

function sendGameState(gameId: string) {
  const room = games.get(gameId);
  if (!room) return;

  const { game } = room;
  
  // Determine game status and winner
  let status: 'playing' | 'checkmate' | 'stalemate' | 'draw' = 'playing';
  let winner: 'white' | 'black' | 'draw' | undefined = undefined;
  
  if (game.inCheckmate()) {
    status = 'checkmate';
    // The player whose turn it is has been checkmated (they lost)
    winner = game.turn === 'white' ? 'black' : 'white';
    console.log(`Game ${gameId}: Checkmate! ${winner} wins`);
  } else if (game.inStalemate()) {
    status = 'stalemate';
    winner = 'draw';
    console.log(`Game ${gameId}: Stalemate - Draw`);
  } else if (game.gameOver()) {
    // Other draw conditions (insufficient material, threefold repetition, etc.)
    status = 'draw';
    winner = 'draw';
    console.log(`Game ${gameId}: Game Over - Draw`);
  }
  
  const stateMsg: ServerMsg = {
    type: 'state',
    fen: game.fen(),
    pgn: game.pgn(),
    nextAction: game.nextActionType(),
    legalMoves:
      game.nextActionType() === 'move' ? game.legalMoves() : undefined,
    legalBans: game.nextActionType() === 'ban' ? game.legalBans() : undefined,
    history: game.history(),
    turn: game.turn,
    gameId,
    players: getPlayerUsernames(room),
    status,
    winner,
    isSoloGame: room.isSoloGame,
  };

  broadcastToRoom(gameId, stateMsg);
}

function matchPlayers() {
  if (queue.length >= 2) {
    // Take first two players from queue
    const player1 = queue.shift()!;
    const player2 = queue.shift()!;

    // Create new game
    const gameId = uuidv4();
    const room: GameRoom = {
      game: new BanChess(),
      players: new Map(),
      whitePlayerId: player1.userId,
      blackPlayerId: player2.userId,
    };

    // Add players to the room
    room.players.set(player1.userId, { color: 'white', username: player1.username });
    room.players.set(player2.userId, { color: 'black', username: player2.username });

    games.set(gameId, room);
    playerToGame.set(player1.userId, gameId);
    playerToGame.set(player2.userId, gameId);

    // Send matched message to both players
    if (player1.ws.readyState === WebSocket.OPEN) {
      player1.ws.send(
        JSON.stringify({
          type: 'matched',
          gameId,
          color: 'white',
          opponent: player2.username,
        } as ServerMsg)
      );
    }

    if (player2.ws.readyState === WebSocket.OPEN) {
      player2.ws.send(
        JSON.stringify({
          type: 'matched',
          gameId,
          color: 'black',
          opponent: player1.username,
        } as ServerMsg)
      );
    }

    console.log(`Matched players ${player1.username} (white) vs ${player2.username} (black) - Game ${gameId} created`);

    // Update queue positions for remaining players
    updateQueuePositions();
  }
}

function updateQueuePositions() {
  queue.forEach((player, index) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(
        JSON.stringify({
          type: 'queued',
          position: index + 1,
        } as ServerMsg)
      );
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
      const msg: ClientMsg = JSON.parse(data.toString());
      console.log('Received message:', msg.type);

      switch (msg.type) {
        case 'authenticate': {
          // Handle authentication
          const { userId, username } = msg;
          
          // Check if this user is already connected
          const existingPlayer = Array.from(authenticatedPlayers.values()).find(p => p.userId === userId);
          if (existingPlayer && existingPlayer.ws !== ws) {
            // Check if the existing connection is still alive
            if (existingPlayer.ws.readyState === WebSocket.OPEN) {
              console.log(`User ${username} already has an active connection, rejecting new connection`);
              // Reject the new connection instead of closing the old one
              ws.send(JSON.stringify({
                type: 'error',
                message: 'User already connected in another session'
              } as ServerMsg));
              ws.close(1008, 'Duplicate connection'); // 1008 = Policy Violation
              return;
            } else {
              // Old connection is dead, clean it up
              console.log(`Cleaning up dead connection for ${username}`);
              authenticatedPlayers.delete(existingPlayer.ws);
            }
          }
          
          // Create or update player
          currentPlayer = { userId, username, ws };
          authenticatedPlayers.set(ws, currentPlayer);
          
          console.log(`Player authenticated: ${username} (${userId})`);
          
          // Send authentication confirmation
          ws.send(
            JSON.stringify({
              type: 'authenticated',
              userId,
              username,
            } as ServerMsg)
          );
          
          // Check if player was in a game (reconnection)
          const gameId = playerToGame.get(userId);
          if (gameId) {
            const room = games.get(gameId);
            if (room) {
              const playerInfo = room.players.get(userId);
              if (playerInfo) {
                // Rejoin the game
                ws.send(
                  JSON.stringify({
                    type: 'joined',
                    gameId,
                    color: playerInfo.color,
                    players: getPlayerUsernames(room),
                  } as ServerMsg)
                );
                
                // Send current game state
                setTimeout(() => sendGameState(gameId), 50);
                
                console.log(`Player ${username} reconnected to game ${gameId}`);
              }
            }
          }
          
          break;
        }

        case 'join-queue': {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not authenticated',
              } as ServerMsg)
            );
            return;
          }
          
          // Check if already in queue
          const inQueue = queue.some(p => p.userId === currentPlayer!.userId);
          
          if (!inQueue && !playerToGame.has(currentPlayer.userId)) {
            queue.push(currentPlayer);
            console.log(`Player ${currentPlayer.username} joined queue. Queue size: ${queue.length}`);

            // Send queue position
            ws.send(
              JSON.stringify({
                type: 'queued',
                position: queue.length,
              } as ServerMsg)
            );

            // Try to match players
            matchPlayers();
          }
          break;
        }

        case 'leave-queue': {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not authenticated',
              } as ServerMsg)
            );
            return;
          }
          
          removeFromQueue(currentPlayer);
          console.log(`Player ${currentPlayer.username} left queue. Queue size: ${queue.length}`);
          break;
        }

        case 'create-solo-game': {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not authenticated',
              } as ServerMsg)
            );
            return;
          }
          
          // Create a new solo game
          const gameId = uuidv4();
          const room: GameRoom = {
            game: new BanChess(),
            players: new Map(),
            whitePlayerId: currentPlayer.userId,
            blackPlayerId: currentPlayer.userId, // Same player controls both colors
            isSoloGame: true,
          };
          
          // Add player to the room for both colors
          room.players.set(currentPlayer.userId, { 
            color: 'white', // Player starts as white but can play both
            username: currentPlayer.username 
          });
          
          games.set(gameId, room);
          playerToGame.set(currentPlayer.userId, gameId);
          
          console.log(`Solo game ${gameId} created for ${currentPlayer.username}`);
          
          // Send game created message
          ws.send(
            JSON.stringify({
              type: 'solo-game-created',
              gameId,
            } as ServerMsg)
          );
          
          break;
        }

        case 'join-game': {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not authenticated',
              } as ServerMsg)
            );
            return;
          }
          
          const gameId = msg.gameId;
          console.log(`Player ${currentPlayer.username} (${currentPlayer.userId}) attempting to join game ${gameId}`);
          
          const room = games.get(gameId);

          if (!room) {
            console.log(`Game ${gameId} not found`);
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Game not found',
              } as ServerMsg)
            );
            return;
          }

          // Log the players in this game room
          console.log(`Game ${gameId} players:`, Array.from(room.players.entries()).map(([id, info]) => 
            `${id} (${info.username}, ${info.color})`
          ));

          // Check if player belongs to this game
          const playerInfo = room.players.get(currentPlayer.userId);
          
          if (playerInfo) {
            // Player is already in the game
            console.log(`Player ${currentPlayer.username} successfully joining as ${playerInfo.color}`);
            playerToGame.set(currentPlayer.userId, gameId);

            // Send joined message with color
            // For solo games, always send the current turn as the player's color
            const effectiveColor = room.isSoloGame ? room.game.turn : playerInfo.color;
            ws.send(
              JSON.stringify({
                type: 'joined',
                gameId,
                color: effectiveColor,
                players: getPlayerUsernames(room),
                isSoloGame: room.isSoloGame,
              } as ServerMsg)
            );

            // Send current game state
            setTimeout(() => sendGameState(gameId), 50);
          } else {
            console.log(`Player ${currentPlayer.username} (${currentPlayer.userId}) is not in game ${gameId}`);
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'You are not a player in this game',
              } as ServerMsg)
            );
          }
          break;
        }

        case 'move': {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not authenticated',
              } as ServerMsg)
            );
            return;
          }
          
          const gameId = playerToGame.get(currentPlayer.userId);
          if (!gameId) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not in a game',
              } as ServerMsg)
            );
            return;
          }

          const room = games.get(gameId);
          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Game not found',
              } as ServerMsg)
            );
            return;
          }

          const playerInfo = room.players.get(currentPlayer.userId);
          // In solo games, allow playing both colors
          if (!room.isSoloGame && (!playerInfo || playerInfo.color !== room.game.turn)) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not your turn',
              } as ServerMsg)
            );
            return;
          }

          if (room.game.nextActionType() !== 'move') {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Expected ban, not move',
              } as ServerMsg)
            );
            return;
          }

          const result = room.game.play({ move: msg.move });

          if (result.success) {
            sendGameState(gameId);
          } else {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: result.error || 'Invalid move',
              } as ServerMsg)
            );
          }
          break;
        }

        case 'ban': {
          if (!currentPlayer) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not authenticated',
              } as ServerMsg)
            );
            return;
          }
          
          const gameId = playerToGame.get(currentPlayer.userId);
          if (!gameId) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not in a game',
              } as ServerMsg)
            );
            return;
          }

          const room = games.get(gameId);
          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Game not found',
              } as ServerMsg)
            );
            return;
          }

          const playerInfo = room.players.get(currentPlayer.userId);
          // In solo games, allow banning for both colors
          if (!room.isSoloGame && (!playerInfo || playerInfo.color !== room.game.turn)) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Not your turn to ban',
              } as ServerMsg)
            );
            return;
          }

          if (room.game.nextActionType() !== 'ban') {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Expected move, not ban',
              } as ServerMsg)
            );
            return;
          }

          const result = room.game.play({ ban: msg.ban });

          if (result.success) {
            sendGameState(gameId);
          } else {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: result.error || 'Invalid ban',
              } as ServerMsg)
            );
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error processing message:', err);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        } as ServerMsg)
      );
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    
    if (currentPlayer) {
      // Remove from authenticated players
      authenticatedPlayers.delete(ws);
      
      // Remove from queue if in it
      removeFromQueue(currentPlayer);
      
      // Handle game disconnection (but don't remove from game - allow reconnection)
      const gameId = playerToGame.get(currentPlayer.userId);
      if (gameId) {
        const room = games.get(gameId);
        if (room) {
          // Notify other player about disconnection
          room.players.forEach((playerInfo, userId) => {
            if (userId !== currentPlayer!.userId) {
              const otherPlayer = Array.from(authenticatedPlayers.values()).find(p => p.userId === userId);
              if (otherPlayer && otherPlayer.ws.readyState === WebSocket.OPEN) {
                otherPlayer.ws.send(
                  JSON.stringify({
                    type: 'error',
                    message: `${currentPlayer!.username} disconnected`,
                  } as ServerMsg)
                );
              }
            }
          });
        }
        
        console.log(`Player ${currentPlayer.username} disconnected from game ${gameId} (can reconnect)`);
      }
    }
  });
});

// Graceful shutdown handling
const shutdown = (signal: string) => {
  console.log(`\n[WebSocket] Received ${signal}, shutting down gracefully...`);
  
  // Close all client connections
  wss.clients.forEach((ws) => {
    ws.close();
  });
  
  // Close the server
  wss.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('[WebSocket] Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
};

// Handle various shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));  // Ctrl+C
process.on('SIGHUP', () => shutdown('SIGHUP'));   // Terminal closed
process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[WebSocket] Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WebSocket] Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});