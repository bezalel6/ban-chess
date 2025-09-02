#!/usr/bin/env node

/**
 * Simple WebSocket test client for debugging ban-chess server
 * Usage: node scripts/test-ws-client.js
 */

const WebSocket = require('ws');
const readline = require('readline');

const WS_URL = 'ws://localhost:3001';
const USER_ID = 'test-user-' + Math.random().toString(36).substring(7);
const USERNAME = 'TestPlayer';

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logJson(label, obj, color = 'cyan') {
  log(`\n${label}:`, color);
  console.log(JSON.stringify(obj, null, 2));
}

// Create WebSocket connection
const ws = new WebSocket(WS_URL);
let currentGameId = null;
let currentPly = 0;
let isConnected = false;

ws.on('open', () => {
  isConnected = true;
  log('\n✅ Connected to WebSocket server', 'green');
  log(`📍 URL: ${WS_URL}`, 'dim');
  log(`👤 User ID: ${USER_ID}`, 'dim');
  
  // Authenticate
  const authMsg = {
    type: 'authenticate',
    userId: USER_ID,
    username: USERNAME
  };
  
  log('\n🔐 Authenticating...', 'yellow');
  ws.send(JSON.stringify(authMsg));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  // Color-code messages by type
  switch(msg.type) {
    case 'authenticated':
      log('\n✅ Authenticated successfully!', 'green');
      log('Available commands:', 'yellow');
      log('  1. create - Create a solo game', 'dim');
      log('  2. join <gameId> - Join existing game', 'dim');
      log('  3. ban <from> <to> - Ban a move (e.g., "ban e7 e5")', 'dim');
      log('  4. move <from> <to> - Make a move (e.g., "move e2 e4")', 'dim');
      log('  5. status - Show current game status', 'dim');
      log('  6. quit - Exit', 'dim');
      break;
      
    case 'game-created':
      currentGameId = msg.gameId;
      log(`\n🎮 Game created! ID: ${currentGameId}`, 'green');
      break;
      
    case 'joined':
      currentGameId = msg.gameId;
      log(`\n🎮 Joined game as ${msg.color}!`, 'green');
      break;
      
    case 'state':
      currentPly = msg.ply || 0;
      log('\n📊 Game State Update:', 'blue');
      log(`  Ply: ${msg.ply}`, 'cyan');
      log(`  Active Player: ${msg.activePlayer}`, 'cyan');
      log(`  Next Action: ${msg.nextAction}`, 'cyan');
      log(`  FEN: ${msg.fen}`, 'dim');
      
      if (msg.legalActions && msg.legalActions.length > 0) {
        log(`\n  Legal Actions (${msg.legalActions.length}):`, 'yellow');
        // Show first 5 legal actions
        msg.legalActions.slice(0, 5).forEach(action => {
          log(`    - ${action}`, 'dim');
        });
        if (msg.legalActions.length > 5) {
          log(`    ... and ${msg.legalActions.length - 5} more`, 'dim');
        }
      }
      
      // Debug info for ban phase
      if (msg.nextAction === 'ban') {
        log('\n🎯 BAN PHASE ACTIVE', 'red');
        log(`  ${msg.activePlayer} should ban ${msg.activePlayer === 'white' ? 'black' : 'white'}'s move`, 'yellow');
        
        // Parse legal actions to show which pieces can be banned
        const bannablePieces = new Set();
        msg.legalActions.forEach(action => {
          if (action.startsWith('b:')) {
            const move = action.substring(2);
            if (move.length >= 2) {
              bannablePieces.add(move.substring(0, 2));
            }
          }
        });
        
        if (bannablePieces.size > 0) {
          log(`  Bannable pieces: ${Array.from(bannablePieces).join(', ')}`, 'magenta');
        }
      }
      break;
      
    case 'error':
      log(`\n❌ Error: ${msg.message}`, 'red');
      break;
      
    default:
      log(`\n📨 ${msg.type}`, 'dim');
      if (Object.keys(msg).length > 1) {
        logJson('  Details', msg, 'dim');
      }
  }
});

ws.on('error', (error) => {
  log(`\n❌ WebSocket error: ${error.message}`, 'red');
});

ws.on('close', () => {
  isConnected = false;
  log('\n👋 Disconnected from server', 'yellow');
  process.exit(0);
});

// Setup readline for interactive commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\n> '
});

rl.prompt();

rl.on('line', (line) => {
  const parts = line.trim().split(' ');
  const command = parts[0];
  
  if (!isConnected && command !== 'quit' && command !== 'exit') {
    log('Not connected to server. Please wait...', 'red');
    rl.prompt();
    return;
  }
  
  switch(command) {
    case 'create':
      ws.send(JSON.stringify({ type: 'create-solo-game' }));
      break;
      
    case 'join':
      if (parts[1]) {
        ws.send(JSON.stringify({ type: 'join-game', gameId: parts[1] }));
      } else {
        log('Usage: join <gameId>', 'yellow');
      }
      break;
      
    case 'ban':
      if (parts[1] && parts[2] && currentGameId) {
        const action = {
          type: 'action',
          gameId: currentGameId,
          action: { ban: { from: parts[1], to: parts[2] } }
        };
        log(`\n➡️ Sending ban: ${parts[1]} → ${parts[2]}`, 'yellow');
        ws.send(JSON.stringify(action));
      } else {
        log('Usage: ban <from> <to> (e.g., ban e7 e5)', 'yellow');
        if (!currentGameId) log('No active game!', 'red');
      }
      break;
      
    case 'move':
      if (parts[1] && parts[2] && currentGameId) {
        const action = {
          type: 'action',
          gameId: currentGameId,
          action: { move: { from: parts[1], to: parts[2] } }
        };
        log(`\n➡️ Sending move: ${parts[1]} → ${parts[2]}`, 'yellow');
        ws.send(JSON.stringify(action));
      } else {
        log('Usage: move <from> <to> (e.g., move e2 e4)', 'yellow');
        if (!currentGameId) log('No active game!', 'red');
      }
      break;
      
    case 'status':
      if (currentGameId) {
        log(`\n📊 Current Status:`, 'blue');
        log(`  Game ID: ${currentGameId}`, 'cyan');
        log(`  Current Ply: ${currentPly}`, 'cyan');
      } else {
        log('No active game!', 'red');
      }
      break;
      
    case 'quit':
    case 'exit':
      ws.close();
      break;
      
    default:
      if (line.trim()) {
        log('Unknown command. Type a command or "quit" to exit.', 'yellow');
      }
  }
  
  rl.prompt();
});

rl.on('close', () => {
  ws.close();
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n👋 Closing connection...', 'yellow');
  ws.close();
  process.exit(0);
});