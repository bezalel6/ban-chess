# Server-Authoritative Architecture Redesign

## Core Principle

**The server is the ONLY source of truth. The client is a dumb terminal.**

## What the Server Should Send

For every game state update, the server sends ONE comprehensive message containing:

```typescript
{
  type: 'game-state',

  // Display Instructions
  board: {
    fen: string,                    // Current board position
    orientation: 'white' | 'black', // Which way to show the board
    highlightedSquares: string[],   // Squares to highlight (bans, checks, etc.)
  },

  // Interaction Instructions
  interaction: {
    enabled: boolean,                // Can the player interact?
    allowedSquares: string[],        // Which squares can be clicked
    actionType: 'move' | 'ban',     // What happens when clicked
  },

  // UI Display
  ui: {
    currentTurnLabel: string,        // "White's Turn" / "Black's Turn"
    actionLabel: string,             // "Ban a White move" / "Make your move"
    playerRole: string,              // "Playing as White" / "Playing as Black"
  },

  // Game Metadata
  meta: {
    gameId: string,
    isSoloGame: boolean,
    players: { white?: string, black?: string }
  }
}
```

## What the Client Should Do

1. **Display the board** exactly as instructed (orientation, highlights)
2. **Enable/disable interaction** based on server instructions
3. **Send clicks to server** when user interacts with allowed squares
4. **Display UI labels** exactly as provided

That's it. NO logic. NO state management. NO perspective calculations.

## Client Code Should Look Like This

```typescript
function GameClient({ gameState, sendAction }) {
  return (
    <>
      <Board
        fen={gameState.board.fen}
        orientation={gameState.board.orientation}
        highlights={gameState.board.highlightedSquares}
        enabled={gameState.interaction.enabled}
        allowedSquares={gameState.interaction.allowedSquares}
        onSquareClick={(from, to) => sendAction({ from, to })}
      />
      <UI
        turnLabel={gameState.ui.currentTurnLabel}
        actionLabel={gameState.ui.actionLabel}
        playerRole={gameState.ui.playerRole}
      />
    </>
  );
}
```

## Server Logic for Solo Games

The server tracks:

- Current chess turn (white/black)
- Current action phase (move/ban)
- Who is acting (different from chess turn during ban phase)

And generates the complete display/interaction state for the client.

## Benefits

1. **Simplicity**: Client has no complex logic
2. **Consistency**: Single source of truth
3. **Security**: Client can't manipulate game state
4. **Debugging**: All logic in one place (server)
5. **Flexibility**: Server can change rules without client updates

## Migration Path

1. Create new server endpoint that sends complete state
2. Strip all logic from client components
3. Update WebSocket messages to new format
4. Remove all client-side state calculations
5. Test thoroughly

This is how it should have been from the start.
