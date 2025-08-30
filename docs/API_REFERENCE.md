# 🔌 2ban-2chess API Reference

## REST API Endpoints

### Authentication Endpoints

---

#### `POST /api/auth/login`

Authenticate a user and create a new session.

##### Request

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "username": "player123"
}
```

**Validation Rules:**

- `username`: Required, string, 2-20 characters, alphanumeric only

##### Response

**Success (200):**

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "player123"
  }
}
```

**Error (400):**

```json
{
  "success": false,
  "error": "Username must be between 2 and 20 alphanumeric characters"
}
```

**Error (500):**

```json
{
  "success": false,
  "error": "Failed to save session"
}
```

##### Example

```typescript
// Using fetch
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ username: 'player123' }),
});

const data = await response.json();
if (data.success) {
  console.log('Logged in as:', data.user.username);
}
```

---

#### `POST /api/auth/logout`

Destroy the current user session.

##### Request

No body required. Session cookie must be present.

##### Response

**Success (200):**

```json
{
  "success": true
}
```

##### Example

```typescript
const response = await fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'same-origin',
});

if (response.ok) {
  console.log('Logged out successfully');
}
```

---

#### `GET /api/auth/session`

Retrieve the current session information.

##### Request

No body required. Session cookie must be present.

##### Response

**With Session (200):**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "player123"
  }
}
```

**No Session (200):**

```json
{}
```

##### Example

```typescript
const response = await fetch('/api/auth/session', {
  credentials: 'same-origin',
});

const data = await response.json();
if (data.user) {
  console.log('Current user:', data.user.username);
} else {
  console.log('Not logged in');
}
```

---

## WebSocket API

### Connection

#### Endpoint

```
ws://localhost:8081
```

#### Connection Example

```typescript
const ws = new WebSocket('ws://localhost:8081');

ws.onopen = () => {
  console.log('Connected to game server');
};

ws.onmessage = event => {
  const message = JSON.parse(event.data);
  handleServerMessage(message);
};

ws.onerror = error => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from game server');
};
```

---

### Client Messages

#### `authenticate`

Authenticate the WebSocket connection with user credentials.

```typescript
{
  type: 'authenticate',
  userId: string,      // UUID from session
  username: string     // Display name
}
```

**Example:**

```typescript
ws.send(
  JSON.stringify({
    type: 'authenticate',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    username: 'player123',
  })
);
```

---

#### `join-queue`

Join the matchmaking queue to find an opponent.

```typescript
{
  type: 'join-queue';
}
```

**Prerequisites:** Must be authenticated

**Example:**

```typescript
ws.send(JSON.stringify({ type: 'join-queue' }));
```

---

#### `leave-queue`

Leave the matchmaking queue.

```typescript
{
  type: 'leave-queue';
}
```

**Prerequisites:** Must be in queue

**Example:**

```typescript
ws.send(JSON.stringify({ type: 'leave-queue' }));
```

---

#### `join-game`

Join an existing game by ID.

```typescript
{
  type: 'join-game',
  gameId: string      // UUID of the game
}
```

**Example:**

```typescript
ws.send(
  JSON.stringify({
    type: 'join-game',
    gameId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
);
```

---

#### `ban`

Ban an opponent's move during the ban phase.

```typescript
{
  type: 'ban',
  gameId: string,
  ban: {
    from: string,     // Square notation (e.g., 'e2')
    to: string        // Square notation (e.g., 'e4')
  }
}
```

**Prerequisites:**

- Must be your turn
- Must be in ban phase
- Ban must be legal

**Example:**

```typescript
ws.send(
  JSON.stringify({
    type: 'ban',
    gameId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ban: {
      from: 'e2',
      to: 'e4',
    },
  })
);
```

---

#### `move`

Make a chess move during the move phase.

```typescript
{
  type: 'move',
  gameId: string,
  move: {
    from: string,              // Square notation
    to: string,                // Square notation
    promotion?: 'q'|'r'|'b'|'n' // For pawn promotion
  }
}
```

**Prerequisites:**

- Must be your turn
- Must be in move phase
- Move must be legal
- Move must not be banned

**Example:**

```typescript
// Regular move
ws.send(
  JSON.stringify({
    type: 'move',
    gameId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    move: {
      from: 'e2',
      to: 'e4',
    },
  })
);

// Pawn promotion
ws.send(
  JSON.stringify({
    type: 'move',
    gameId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    move: {
      from: 'e7',
      to: 'e8',
      promotion: 'q',
    },
  })
);
```

---

### Server Messages

#### `authenticated`

Confirmation of successful authentication.

```typescript
{
  type: 'authenticated',
  userId: string,
  username: string
}
```

---

#### `queued`

Confirmation that player has joined the queue.

```typescript
{
  type: 'queued',
  position: number    // Position in queue
}
```

---

#### `matched`

Players have been matched for a game.

```typescript
{
  type: 'matched',
  gameId: string,
  color: 'white' | 'black',
  opponent?: string   // Opponent's username
}
```

---

#### `joined`

Successfully joined a game.

```typescript
{
  type: 'joined',
  gameId: string,
  color: 'white' | 'black',
  players?: {
    white?: string,   // White player's username
    black?: string    // Black player's username
  }
}
```

---

#### `state`

Current game state update.

```typescript
{
  type: 'state',
  fen: string,                    // Board position in FEN notation
  pgn: string,                    // Game history in PGN format
  nextAction: 'ban' | 'move',     // Next expected action
  legalMoves?: Move[],            // Available moves (move phase)
  legalBans?: Ban[],              // Available bans (ban phase)
  history?: HistoryEntry[],       // Complete game history
  turn: 'white' | 'black',        // Whose turn it is
  gameId: string,
  players?: {
    white?: string,
    black?: string
  }
}
```

**Move Type:**

```typescript
interface Move {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}
```

**Ban Type:**

```typescript
interface Ban {
  from: string;
  to: string;
}
```

**HistoryEntry Type:**

```typescript
interface HistoryEntry {
  turnNumber: number;
  player: 'white' | 'black';
  actionType: 'ban' | 'move';
  action: Ban | Move;
  san?: string; // Standard Algebraic Notation
  fen: string; // Position after action
  bannedMove?: Ban; // The banned move (if ban action)
}
```

---

#### `error`

Error message from the server.

```typescript
{
  type: 'error',
  message: string,           // Human-readable error
  error?: string            // Technical error details
}
```

**Common Errors:**

- "Not authenticated"
- "Game not found"
- "Not your turn"
- "Illegal move"
- "Illegal ban"
- "Already in queue"
- "Not in queue"

---

## Type Definitions

### Core Game Types

```typescript
// Chess square in algebraic notation
type Square = string; // e.g., 'e4', 'a1', 'h8'

// Player color
type Color = 'white' | 'black';

// Game phase
type ActionType = 'ban' | 'move';

// Piece promotion options
type PromotionPiece = 'q' | 'r' | 'b' | 'n';
```

### Message Types Summary

```typescript
// All client message types
type ClientMsg =
  | { type: 'authenticate'; userId: string; username: string }
  | { type: 'join-queue' }
  | { type: 'leave-queue' }
  | { type: 'join-game'; gameId: string }
  | { type: 'ban'; gameId: string; ban: Ban }
  | { type: 'move'; gameId: string; move: Move };

// All server message types
type ServerMsg =
  | { type: 'state' /* ... */ }
  | { type: 'error'; message: string; error?: string }
  | { type: 'authenticated'; userId: string; username: string }
  | { type: 'queued'; position: number }
  | { type: 'matched'; gameId: string; color: Color; opponent?: string }
  | { type: 'joined'; gameId: string; color: Color; players?: object };
```

---

## Error Handling

### HTTP Errors

| Status Code | Meaning      | Common Causes                     |
| ----------- | ------------ | --------------------------------- |
| 400         | Bad Request  | Invalid input, validation failure |
| 401         | Unauthorized | Missing or invalid session        |
| 404         | Not Found    | Resource doesn't exist            |
| 500         | Server Error | Internal server error             |

### WebSocket Errors

WebSocket errors are sent as `error` type messages with descriptive messages.

**Error Response Pattern:**

```typescript
{
  type: 'error',
  message: string,      // User-friendly message
  error?: string       // Technical details (optional)
}
```

### Connection Errors

- **1000**: Normal closure
- **1001**: Going away (server shutdown)
- **1002**: Protocol error
- **1003**: Unsupported data
- **1006**: Abnormal closure (network issue)
- **1011**: Server error

---

## Rate Limiting

Currently no rate limiting is implemented. Future versions will include:

- Authentication: 5 attempts per minute
- Game moves: 60 moves per minute
- Queue joins: 10 per minute
- WebSocket connections: 5 per IP

---

## Best Practices

### Connection Management

1. **Reconnection Logic**: Implement exponential backoff
2. **Heartbeat**: Send periodic ping messages
3. **Error Recovery**: Handle disconnections gracefully
4. **State Sync**: Request full state on reconnection

### Security

1. **Authentication**: Always authenticate before game operations
2. **Validation**: Validate moves client-side before sending
3. **Session Management**: Handle session expiry gracefully
4. **Input Sanitization**: Sanitize usernames and game IDs

### Performance

1. **Message Batching**: Combine multiple operations when possible
2. **State Caching**: Cache game state locally
3. **Debouncing**: Debounce rapid user actions
4. **Compression**: Future support for message compression

---

## Examples

### Complete Game Flow

```typescript
// 1. Authenticate via REST
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'player123' }),
});
const { user } = await loginResponse.json();

// 2. Connect to WebSocket
const ws = new WebSocket('ws://localhost:8081');

// 3. Authenticate WebSocket connection
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: 'authenticate',
      userId: user.id,
      username: user.username,
    })
  );
};

// 4. Join queue after authentication
ws.onmessage = event => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'authenticated') {
    // Join matchmaking queue
    ws.send(JSON.stringify({ type: 'join-queue' }));
  }

  if (msg.type === 'matched') {
    console.log(`Matched! Playing as ${msg.color} against ${msg.opponent}`);
    // Game will start automatically
  }

  if (msg.type === 'state') {
    // Handle game state updates
    updateBoard(msg.fen);

    if (msg.nextAction === 'ban' && isMyTurn(msg.turn)) {
      // Select a ban
      const ban = selectBan(msg.legalBans);
      ws.send(
        JSON.stringify({
          type: 'ban',
          gameId: msg.gameId,
          ban,
        })
      );
    }

    if (msg.nextAction === 'move' && isMyTurn(msg.turn)) {
      // Make a move
      const move = selectMove(msg.legalMoves);
      ws.send(
        JSON.stringify({
          type: 'move',
          gameId: msg.gameId,
          move,
        })
      );
    }
  }
};
```

---

## Version History

- **v0.1.0** (Current): Initial MVP with core game functionality
- **v0.2.0** (Planned): Add persistent storage and game history
- **v0.3.0** (Planned): Add tournament system and ELO ratings

---

_Last Updated: 2025-08-26_
