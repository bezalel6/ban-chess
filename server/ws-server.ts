import { WebSocketServer, WebSocket } from 'ws';
import { BanChess } from 'ban-chess.ts';
import type { ClientMsg, ServerMsg, Move, Ban } from '../lib/game-types';

interface GameRoom {
  game: BanChess;
  players: Map<WebSocket, 'white' | 'black' | 'spectator'>;
  whitePlayer?: WebSocket;
  blackPlayer?: WebSocket;
}

const wss = new WebSocketServer({ port: 8081 });
const games = new Map<string, GameRoom>();

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

wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');

  ws.on('message', (data: Buffer) => {
    try {
      const msg: ClientMsg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'create': {
          if (games.has(msg.gameId)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Game already exists' 
            } as ServerMsg));
            return;
          }

          const room: GameRoom = {
            game: new BanChess(),
            players: new Map([[ws, 'white']]),
            whitePlayer: ws,
          };

          games.set(msg.gameId, room);
          
          ws.send(JSON.stringify({ 
            type: 'created', 
            gameId: msg.gameId 
          } as ServerMsg));

          sendGameState(msg.gameId);
          break;
        }

        case 'join': {
          let room = games.get(msg.gameId);
          
          if (!room) {
            room = {
              game: new BanChess(),
              players: new Map(),
            };
            games.set(msg.gameId, room);
          }

          let color: 'white' | 'black' | 'spectator' = 'spectator';
          
          if (!room.whitePlayer) {
            room.whitePlayer = ws;
            color = 'white';
          } else if (!room.blackPlayer) {
            room.blackPlayer = ws;
            color = 'black';
          }

          room.players.set(ws, color);

          ws.send(JSON.stringify({ 
            type: 'joined', 
            gameId: msg.gameId,
            color 
          } as ServerMsg));

          sendGameState(msg.gameId);
          break;
        }

        case 'move': {
          const room = games.get(msg.gameId);
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
            sendGameState(msg.gameId);
          } else {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: result.error || 'Invalid move' 
            } as ServerMsg));
          }
          break;
        }

        case 'ban': {
          const room = games.get(msg.gameId);
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
            sendGameState(msg.gameId);
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
    games.forEach((room, gameId) => {
      if (room.players.has(ws)) {
        room.players.delete(ws);
        if (room.whitePlayer === ws) room.whitePlayer = undefined;
        if (room.blackPlayer === ws) room.blackPlayer = undefined;
        
        if (room.players.size === 0) {
          games.delete(gameId);
        }
      }
    });
  });
});

process.on('SIGTERM', () => {
  wss.close(() => {
    process.exit(0);
  });
});