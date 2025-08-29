# Ban Chess TypeScript Library - API Reference (v1.2.2)

## Ban Chess Notation (BCN)
A compact, network-friendly format for representing Ban Chess actions:
- **Ban**: `b:e2e4` (6 characters) - Bans the move from e2 to e4
- **Move**: `m:d2d4` (6 characters) - Moves from d2 to d4  
- **Promotion**: `m:e7e8q` (7-8 characters) - Promotes to queen

This format is ~90% more compact than JSON and enables efficient network transmission and storage.

## Serialization Methods

### Action Serialization (Ban Chess Notation - BCN)
```typescript
// Serialize an action to compact string format
BanChess.serializeAction({ ban: { from: 'e2', to: 'e4' } });
// Returns: "b:e2e4"

BanChess.serializeAction({ move: { from: 'd2', to: 'd4' } });
// Returns: "m:d2d4"

// Deserialize an action from string
BanChess.deserializeAction('b:e2e4');
// Returns: { ban: { from: 'e2', to: 'e4' } }

BanChess.deserializeAction('m:d2d4');
// Returns: { move: { from: 'd2', to: 'd4' } }
```

### Ban Chess Notation (BCN) Format
- Ban: `b:e2e4` (6 characters)
- Move: `m:d2d4` (6 characters)  
- Promotion: `m:e7e8q` (7-8 characters)

## Game State Management

### Synchronization State
```typescript
// Get synchronization state for network transmission
const syncState = game.getSyncState();
// Returns: { fen: string, lastAction?: string, moveNumber: number }

// Load game from sync state
game.loadFromSyncState(syncState);
```

### Action History
```typescript
// Get complete action history as serialized strings
const history = game.getActionHistory();
// Returns: ["b:e2e4", "m:d2d4", "b:e7e5", "m:d7d5", ...]

// Replay entire game from action history
const game = BanChess.replayFromActions(history);
```

## PGN Handling
```typescript
// Generate PGN with ban annotations
console.log(game.pgn()); 
// Output: "1. {banning: e2e4} d4 {banning: e7e5} d5"

// Note: PGN loading not yet supported - use action history instead
```

## Network Communication Pattern

### WebSocket Example
```typescript
// Send action
ws.send(BanChess.serializeAction(action));

// Receive and play
ws.on('message', (data) => {
  const action = BanChess.deserializeAction(data);
  game.play(action);
});
```

### REST API Example
```typescript
// Request
POST /api/game/action
{ "action": "b:e2e4" }

// Response  
{ 
  "syncState": {
    "fen": "...",
    "lastAction": "b:e2e4",
    "moveNumber": 1
  }
}
```

## Recommended Redis Storage Pattern

```typescript
// Store in Redis
const gameData = {
  actionHistory: game.getActionHistory(),  // ["b:e2e4", "m:d2d4", ...]
  syncState: game.getSyncState(),          // Current state for quick load
  pgn: game.pgn()                          // Human-readable format
};

// Reconstruct from Redis
const game = BanChess.replayFromActions(gameData.actionHistory);
// OR for quick state without full history
const game = new BanChess();
game.loadFromSyncState(gameData.syncState);
```