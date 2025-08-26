# BAN-CHESS CANONICAL RULES
**Version 1.0.0 - Single Source of Truth**

This document serves as the **DEFINITIVE** ruleset for Ban-Chess. All implementations MUST conform to these rules exactly. Any deviation is a bug.

## Table of Contents
1. [Core Principles](#core-principles)
2. [Turn Order & Game Flow](#turn-order--game-flow)
3. [Ban Mechanics](#ban-mechanics)
4. [Move Mechanics](#move-mechanics)
5. [Special Moves](#special-moves)
6. [Check & Checkmate](#check--checkmate)
7. [Draw Conditions](#draw-conditions)
8. [Game End Conditions](#game-end-conditions)
9. [Edge Cases](#edge-cases)
10. [Counter-Programming Instructions](#counter-programming-instructions)

---

## Core Principles

1. **Ban-Chess is asymmetric**: Black always bans first, creating intentional asymmetry
2. **One ban at a time**: Only ONE move can be banned at any given moment
3. **Temporary bans**: Bans last for EXACTLY one move, then expire
4. **No accumulation**: Bans do not stack or accumulate
5. **Turn alternation**: ban → move → ban → move (after initial black ban)

## Turn Order & Game Flow

### Game Start Sequence
1. **Move 0**: Black bans a white move (MANDATORY)
2. **Move 1**: White makes a move (cannot be the banned move)
3. **Move 1 (cont)**: White bans a black move
4. **Move 1 (cont)**: Black makes a move (cannot be the banned move)
5. **Move 2**: Black bans a white move
6. Continue alternating: move → ban for same color

### Turn Determination
```
IF game just started:
  Current turn = BLACK (for ban)
ELSE IF last action was BAN:
  Current turn = Color whose move was banned (for move)
ELSE IF last action was MOVE:
  Current turn = Color who just moved (for ban)
```

### CANONICAL RULING: Black Bans First
**DECISION**: Black ALWAYS bans first. This is intentional game design to offset White's traditional first-move advantage in chess.

## Ban Mechanics

### What Can Be Banned
1. **Any legal move** of the opponent can be banned
2. **Format**: Ban is specified as `{from: Square, to: Square}`
3. **Scope**: Ban affects ONLY the exact from→to combination

### Ban Duration
- **Lifetime**: EXACTLY one move
- **Expiration**: Ban expires immediately after opponent makes any legal move
- **No persistence**: Previous bans have no effect on future turns

### Legal Bans Calculation
```
Legal bans = ALL legal moves of the opponent in current position
```

### CANONICAL RULING: Special Move Bans
1. **Castling CAN be banned**: Banning e1→g1 prevents kingside castling
2. **En passant CAN be banned**: Treated as a normal pawn capture move
3. **Promotion CAN be banned**: Banning e7→e8 bans ALL promotion types to that square

## Move Mechanics

### Legal Moves After Ban
```
Legal moves = All standard chess moves MINUS the currently banned move
```

### Move Validation
1. Move must be legal according to standard chess rules
2. Move must NOT match the currently banned {from, to} pair
3. Move must follow all standard chess constraints (can't leave king in check, etc.)

## Special Moves

### Castling
- **Can be banned**: By banning king's movement (e.g., e1→g1)
- **Implementation**: Treat as king move for ban purposes
- **Rights preservation**: Banning castling doesn't remove castling rights permanently

### En Passant
- **Can be banned**: By banning the capturing pawn's move
- **Window**: En passant opportunity expires normally (one move)
- **Ban interaction**: If en passant is banned, opportunity still expires after one move

### Pawn Promotion
- **Ban affects ALL pieces**: Banning e7→e8 prevents promotion to Q, R, B, or N
- **Implementation**: Ban checks only {from, to}, not promotion piece

### CANONICAL RULING: Promotion Ban Scope
**DECISION**: A ban on a promotion square (e.g., e7→e8) prevents ALL promotions to that square, regardless of piece choice.

## Check & Checkmate

### Check Interactions with Bans
1. **Getting out of check is MANDATORY**: Standard chess rule applies
2. **Banning escape moves**: You CAN ban moves that would escape check
3. **If only escape is banned**: This creates CHECKMATE (game over)

### CANONICAL RULING: Check Priority
**DECISION**: If a player is in check and their only legal escape move is banned, they are in CHECKMATE. The ban takes precedence.

### Checkmate Definition
```
Checkmate occurs when:
1. King is in check AND
2. No legal moves exist (considering current ban) to escape check
```

## Draw Conditions

### Stalemate
```
Stalemate occurs when:
1. Player is NOT in check AND
2. Player has no legal moves (considering current ban)
```

### CANONICAL RULING: Stalemate with Bans
**DECISION**: If all moves are banned (theoretical edge case), it's stalemate if not in check.

### Three-fold Repetition
- **Position includes ban state**: Same position + same ban = same state
- **Count**: Three identical states trigger draw claim
- **Implementation**: Include ban in position hash

### Fifty-Move Rule
- **Bans do NOT count as moves** for the fifty-move counter
- **Only actual piece movements** reset the counter
- **Pawn moves and captures** reset as normal

### CANONICAL RULING: Draw Rules
**DECISION**: 
1. Three-fold repetition considers ban state
2. Fifty-move rule ignores bans (only counts actual moves)
3. Insufficient material draws apply normally

## Game End Conditions

### Victory Conditions
1. **Checkmate**: Opponent's king in check with no legal escape (considering ban)
2. **Resignation**: Player voluntarily resigns
3. **Time forfeit**: Player runs out of time (if using time control)

### Draw Conditions
1. **Stalemate**: No legal moves while not in check
2. **Three-fold repetition**: Same position + ban state three times
3. **Fifty-move rule**: 50 moves without pawn move or capture
4. **Insufficient material**: Neither side can force checkmate
5. **Mutual agreement**: Both players agree to draw

## Edge Cases

### Only One Legal Move Scenarios
- **If only move is banned**: Results in checkmate (if in check) or stalemate (if not in check)
- **No "pass" option**: Players cannot skip their turn

### Disconnection Handling
- **During ban phase**: Player must reconnect to continue
- **During move phase**: Player must reconnect to continue
- **Reconnection**: Game state fully preserved, including current ban

### Time Controls (Optional Feature)
- **Not mandatory**: Games can be played without time limits
- **When implemented**: Standard chess clock rules apply
- **No auto-banning**: Players must always make their own ban choices
- **Time forfeit**: Losing on time is a valid loss condition when time controls are active

## Counter-Programming Instructions

### DO NOT Rely on chess.ts Defaults
```javascript
// WRONG - Don't assume chess.ts handles bans
const isLegal = chess.isLegalMove(move);

// CORRECT - Always check ban explicitly
const isLegal = chess.isLegalMove(move) && !isBannedMove(move);
```

### MANDATORY Validations

1. **Always validate ban state** before move execution
2. **Never trust client**: Server must validate all bans and moves
3. **State synchronization**: Include ban in ALL state transmissions
4. **FEN extension**: Always append ban state to FEN string

### Required Implementation Checks

```typescript
// Every move handler MUST include:
1. Verify it's the player's turn
2. Verify correct action type (ban vs move)
3. Verify move/ban is in legal list
4. Apply action through BanChess library
5. Broadcast new state to all clients
6. Update game history with ban state
```

### Forbidden Shortcuts

**NEVER**:
- Skip ban validation "for performance"
- Allow moves during ban phase
- Allow bans during move phase
- Persist bans beyond one move
- Let clients determine legal moves/bans

### Library Compliance

**MANDATORY**: All game logic MUST go through `BanChess` class from `ban-chess.ts`. Direct chess.ts manipulation is FORBIDDEN.

---

## Revision History

- **v1.0.0** (2024): Initial canonical rules established
- All ambiguities resolved with definitive rulings
- Counter-programming instructions added

**THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH FOR BAN-CHESS RULES**