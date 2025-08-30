# Correct Solo Game Flow

## The Problem

The current implementation is broken because it tries to treat solo games like multiplayer games with patches, rather than understanding the fundamental difference in how solo games should work.

## Correct Behavior

In a solo game, the player alternates between playing for White and Black. The perspective and control should be based on **who is acting**, not the chess turn.

### Detailed Flow:

1. **Game Start (White's turn, but Black acts first)**
   - Board shows BLACK perspective
   - Player bans one of White's moves (e.g., ban e2e4)
   - Board stays in BLACK perspective

2. **White's Move Phase**
   - Board flips to WHITE perspective
   - Player plays White's move (without banned move available)
   - Board stays in WHITE perspective

3. **Black's Ban Phase**
   - Board stays in WHITE perspective (we're acting as White, banning Black's move)
   - Player bans one of Black's moves (e.g., ban d7d5)
   - Board flips to BLACK perspective

4. **Black's Move Phase**
   - Board shows BLACK perspective
   - Player plays Black's move (without banned move available)
   - Board stays in BLACK perspective

5. **White's Ban Phase**
   - Board stays in BLACK perspective (we're acting as Black, banning White's move)
   - Player bans one of White's moves
   - Board flips to WHITE perspective

6. **Repeat from step 2**

## Key Principles

1. **Perspective is based on the acting player:**
   - When banning FOR opponent, show opponent's perspective
   - When moving, show current player's perspective

2. **State Management:**
   - playerColor in solo games should be: who is ACTING, not whose chess turn it is
   - The board orientation should follow the acting player

3. **No Refreshes Required:**
   - Every state transition must work without page refresh
   - Legal actions must always be available when expected

## Implementation Requirements

1. Server must send:
   - Current chess turn (whose pieces move)
   - Acting player (who is making decisions)
   - Legal actions for the acting player
   - Proper perspective/color for the acting player

2. Client must:
   - Display board from acting player's perspective
   - Enable controls for acting player
   - Properly transition between states

3. State transitions:
   - Ban → Move: perspective flips
   - Move → Ban: perspective stays
   - All transitions update acting player correctly
