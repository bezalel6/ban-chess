import { WebSocketServer, WebSocket } from 'ws';
import { BanChess } from 'ban-chess.ts';
import { v4 as uuidv4 } from 'uuid';
import type { ClientMsg, ServerMsg, Move, Ban } from '../lib/game-types';

interface GameRoom {
  game: BanChess;
  players: Map<WebSocket, 'white' | 'black'>;
  whitePlayer: WebSocket;
  blackPlayer: WebSocket;
}

const wss = new WebSocketServer({ port: 8081 });
const games = new Map<string, GameRoom>();
const queue: WebSocket[] = [];
const playerToGame = new Map<WebSocket, string>();

console.log('WebSocket server started on ws://localhost:8081');

function broadcastToRoom(gameId: string, msg: ServerMsg) {
  const room = games.get(gameId);
  if (!room) return;

  const msgStr = JSON.stringify(msg);
  room.players.forEach((_, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msgStr);
    }
  });
}

function sendGameState(gameId: string) {
  const room = games.get(gameId);
  if (!room) return;

  const { game } = room;
  const stateMsg: ServerMsg = {
    type: 'state',
    fen: game.fen(),
    pgn: game.pgn(),
    nextAction: game.nextActionType(),
    legalMoves: game.nextActionType() === 'move' ? game.legalMoves() : undefined,
    legalBans: game.nextActionType() === 'ban' ? game.legalBans() : undefined,
    history: game.history(),
    turn: game.turn,
    gameId,
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
      players: new Map(), // Don't add queue connections - they'll disconnect
      whitePlayer: player1, // Keep for reference but they'll reconnect
      blackPlayer: player2,
    };
    
    games.set(gameId, room);
    // Don't map queue connections to game - they're about to disconnect
    
    // Send matched message to both players
    if (player1.readyState === WebSocket.OPEN) {
      player1.send(JSON.stringify({
        type: 'matched',
        gameId,
        color: 'white'
      } as ServerMsg));
    }
    
    if (player2.readyState === WebSocket.OPEN) {
      player2.send(JSON.stringify({
        type: 'matched',
        gameId,
        color: 'black'
      } as ServerMsg));
    }
    
    console.log(`Matched players - Game ${gameId} created`);
    
    // Don't send game state yet - players will reconnect with new WebSockets
    
    // Update queue positions for remaining players
    updateQueuePositions();
  }
}

function updateQueuePositions() {
  queue.forEach((ws, index) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'queued',
        position: index + 1
      } as ServerMsg));
    }
  });
}

function removeFromQueue(ws: WebSocket) {
  const index = queue.indexOf(ws);
  if (index > -1) {
    queue.splice(index, 1);
    updateQueuePositions();
  }
}

wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');

  ws.on('message', (data: Buffer) => {
    try {
      const msg: ClientMsg = JSON.parse(data.toString());
      console.log('Received message:', msg.type);

      switch (msg.type) {
        case 'join-queue': {
          // Add to queue if not already in it
          if (!queue.includes(ws) && !playerToGame.has(ws)) {
            queue.push(ws);
            console.log(`Player joined queue. Queue size: ${queue.length}`);
            
            // Send queue position
            ws.send(JSON.stringify({
              type: 'queued',
              position: queue.length
            } as ServerMsg));
            
            // Try to match players
            matchPlayers();
          }
          break;
        }
        
        case 'leave-queue': {
          removeFromQueue(ws);
          console.log(`Player left queue. Queue size: ${queue.length}`);
          break;
        }
        
        case 'join-game': {
          const gameId = msg.gameId;
          const room = games.get(gameId);
          
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Game not found'
            } as ServerMsg));
            return;
          }
          
          // Determine player color based on available slots
          let playerColor: 'white' | 'black' | null = null;
          
          // Check if this websocket is already in the game
          if (room.players.has(ws)) {
            playerColor = room.players.get(ws)!;
          } else {
            // New connection - assign to available slot
            if (!Array.from(room.players.values()).includes('white')) {
              playerColor = 'white';
              room.players.set(ws, 'white');
            } else if (!Array.from(room.players.values()).includes('black')) {
              playerColor = 'black';
              room.players.set(ws, 'black');
            }
          }
          
          if (playerColor) {
            playerToGame.set(ws, gameId);
            
            // Send joined message with color
            ws.send(JSON.stringify({
              type: 'joined',
              gameId,
              color: playerColor
            } as ServerMsg));
            
            // Send current game state
            setTimeout(() => sendGameState(gameId), 50);
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Game is full'
            } as ServerMsg));
          }
          break;
        }

        case 'move': {
          const gameId = playerToGame.get(ws);
          if (!gameId) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Not in a game' 
            } as ServerMsg));
            return;
          }
          
          const room = games.get(gameId);
          if (!room) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Game not found' 
            } as ServerMsg));
            return;
          }

          const playerColor = room.players.get(ws);
          if (playerColor !== room.game.turn) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Not your turn' 
            } as ServerMsg));
            return;
          }

          if (room.game.nextActionType() !== 'move') {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Expected ban, not move' 
            } as ServerMsg));
            return;
          }

          const result = room.game.play({ move: msg.move });
          
          if (result.success) {
            sendGameState(gameId);
          } else {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: result.error || 'Invalid move' 
            } as ServerMsg));
          }
          break;
        }

        case 'ban': {
          const gameId = playerToGame.get(ws);
          if (!gameId) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Not in a game' 
            } as ServerMsg));
            return;
          }
          
          const room = games.get(gameId);
          if (!room) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Game not found' 
            } as ServerMsg));
            return;
          }

          const playerColor = room.players.get(ws);
          const banningPlayer = room.game.turn;
          
          if (playerColor !== banningPlayer) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Not your turn to ban' 
            } as ServerMsg));
            return;
          }

          if (room.game.nextActionType() !== 'ban') {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Expected move, not ban' 
            } as ServerMsg));
            return;
          }

          const result = room.game.play({ ban: msg.ban });
          
          if (result.success) {
            sendGameState(gameId);
          } else {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: result.error || 'Invalid ban' 
            } as ServerMsg));
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error processing message:', err);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      } as ServerMsg));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    
    // Remove from queue if in it
    removeFromQueue(ws);
    
    // Handle game disconnection
    const gameId = playerToGame.get(ws);
    if (gameId) {
      const room = games.get(gameId);
      if (room) {
        // Only clean up if this ws was actually playing (not just from queue)
        if (room.players.has(ws)) {
          // Notify other player
          room.players.forEach((color, player) => {
            if (player !== ws && player.readyState === WebSocket.OPEN) {
              player.send(JSON.stringify({
                type: 'error',
                message: 'Opponent disconnected'
              } as ServerMsg));
            }
          });
          
          // Remove this connection from the game
          room.players.delete(ws);
        }
        
        // Clean up mapping
        playerToGame.delete(ws);
        
        // Don't delete the game - players will reconnect with new WebSockets
        // Only delete if game is truly abandoned (could add timeout logic here)
      }
    }
  });
});

process.on('SIGTERM', () => {
  wss.close(() => {
    process.exit(0);
  });
});