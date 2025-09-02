#!/usr/bin/env node

const WebSocket = require("ws");

const WS_URL = "ws://localhost:3001";
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Create two players
const white = { ws: null, userId: "test-white-" + Date.now(), username: "WhitePlayer" };
const black = { ws: null, userId: "test-black-" + Date.now(), username: "BlackPlayer" };
let gameId = null;

function log(player, msg, data) {
  const color = player === "white" ? colors.cyan : colors.magenta;
  console.log(`${color}[${player.toUpperCase()}]${colors.reset} ${msg}`, data || "");
}

async function connectPlayer(player, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    
    ws.on("open", () => {
      log(name, "Connected, authenticating...");
      ws.send(JSON.stringify({
        type: "auth",
        userId: player.userId,
        username: player.username,
      }));
    });
    
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === "authenticated") {
        log(name, "Authenticated ✓");
        player.ws = ws;
        resolve(ws);
      } else if (msg.type === "state" && msg.gameId) {
        gameId = msg.gameId;
        log(name, `Game state - Ply: ${msg.ply}, Active: ${msg.activePlayer}, Action: ${msg.nextAction}`);
        
        // Check if it's White's turn to ban (ply 3)
        if (msg.ply === 3 && msg.activePlayer === "white" && msg.nextAction === "ban") {
          log(name, "✅ PLY 3 - WHITE'S TURN TO BAN!");
          log(name, `Legal actions available: ${msg.legalActions?.length || 0}`);
          
          // Try to ban e7e5 (Black's common pawn move)
          if (name === "white" && msg.legalActions?.includes("b:e7e5")) {
            log(name, "Attempting to ban e7e5...");
            ws.send(JSON.stringify({
              type: "action",
              gameId: gameId,
              action: "b:e7e5"
            }));
          }
        }
      } else if (msg.type === "action-result") {
        if (msg.success) {
          log(name, `✅ Action successful: ${msg.action}`);
        } else {
          log(name, `❌ Action failed: ${msg.error}`);
        }
      }
    });
    
    ws.on("error", reject);
  });
}

async function runTest() {
  console.log(colors.green + "=== Testing White Ban at Ply 3 ===" + colors.reset);
  
  // Connect both players
  await connectPlayer(white, "white");
  await connectPlayer(black, "black");
  
  // Create a game
  log("white", "Creating solo game...");
  white.ws.send(JSON.stringify({
    type: "create-solo",
    timeControl: { initial: 300, increment: 0 }
  }));
  
  // Wait for game to be created
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!gameId) {
    console.error(colors.red + "Failed to create game!" + colors.reset);
    process.exit(1);
  }
  
  log("white", `Game created: ${gameId}`);
  
  // Sequence: Black bans (ply 1), White moves (ply 2), White bans (ply 3)
  
  // Ply 1: Black bans something
  log("black", "Black banning e2e4...");
  white.ws.send(JSON.stringify({
    type: "action",
    gameId: gameId,
    action: "b:e2e4"
  }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Ply 2: White makes a move
  log("white", "White moving d2d4...");
  white.ws.send(JSON.stringify({
    type: "action",
    gameId: gameId,
    action: "m:d2d4"
  }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Ply 3: White should now be able to ban a Black move
  // The handler above will attempt this automatically
  
  // Keep connection alive to see results
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log(colors.green + "\n=== Test Complete ===" + colors.reset);
  console.log("Check the console output above to see if White successfully banned at ply 3");
  
  process.exit(0);
}

runTest().catch(console.error);