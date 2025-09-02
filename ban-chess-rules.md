# BAN CHESS — Rules, Notation, and LLM-Oriented Game Flow

> Concise, machine-friendly description for parsers/LLMs and implementers.

## 1 — Core rule summary

- **Name:** BAN CHESS.
- **Base:** standard chess rules apply unless overridden below.
- **Ban phase (mandatory):** before a player X moves, the opponent Y **must** ban one **source→destination square pair** (`from`,`to`).
  - The ban removes _all_ legal moves whose `from` square equals `from` and `to` square equals `to` (captures, quiet moves, promotions, en passant variants matching the pair).

- **Move phase:** X must play one of the remaining legal moves after the ban.
- **Game-over checkpoints:** the game can end immediately **after the ban** (if X has no legal moves while in check → checkmate; if no legal moves and not in check → stalemate) or **after the move** (regular chess termination: checkmate, stalemate, draw, resignation).

## 2 — Machine primitives (minimal)

- **Move:** `{from: "e2", to: "e4", piece: "P", promotion?: "Q" | "R" | "B" | "N"}`
- **Ban:** `{from: "e8", to: "f7"}`
- **GameState:** `{board, sideToMove, legalMoves: Move[], ban?: Ban | null, halfmoveClock, fullmoveNumber, result?}`
- **MovesMatching(ban, moves):** returns `moves.filter(m => m.from===ban.from && m.to===ban.to)`

## 3 — Turn flow (LLM/pseudocode)

```
while not game_over(state):
  X = state.sideToMove
  Y = opponent(X)

  # Ban phase (mandatory)
  ban = Y.selectBanPair(X.legalMoves)   # ban.from, ban.to
  state.legalMoves = state.legalMoves.filter(m => !(m.from==ban.from && m.to==ban.to))
  state.ban = ban
  if state.legalMoves.length == 0:
    if king_in_check(X): return win(Y, reason="ban-checkmate")
    else: return draw("ban-stalemate")

  # Move phase
  move = X.selectMove(state.legalMoves)
  apply_move(state, move)
  update_legal_moves(state)
  if terminal(state): return result
  switch_side_to_move(state)
```

## 4 — Notation (concise)

- **PGN-style ban annotation (repo convention):** a comment placed _before_ the move it affects, JSON-like or short form.
  - Example: `{banning: e8f7}` (ban of `e8`→`f7`).
  - Place the annotation immediately after the move that produced the position to be banned (i.e. the banning player writes it before the next player's move).

- **Extended-FEN idea (compatible with repo):** add a 7th field `b:fromto` when a ban is currently active or was just applied, e.g. standard-FEN + ` b:e8f7` or a dedicated field `b:e8f7`.

## 5 — Examples (short and deterministic)

### Example A — Opening flow

```
1. e4  (Black bans e2e4)  -> White cannot play e2->e4 this turn
1... e5 (White bans c7c5) -> Black cannot play c7->c5 this turn
```

### Example B — Promotion ban

- White pawn on `e7`. Black bans `{banning: e7e8}`. That removes all `e7->e8` promotions (any promotion piece) for that turn.

### Example C — Scholar-mate (queen-only mate via ban)

Algebraic:

```
1. e4 e5
2. Qh5 Nc6
3. Bc4 Nf6
4. Qxf7+  {banning: e8f7}
```

Flow explanation (LLM-oriented):

- After `4. Qxf7+` sideToMove=Black. Before Black moves, White (opponent) must ban one `from->to` pair; Black's only legal reply is `e8->f7` (Kxf7). White bans `e8->f7`.
- After applying the ban, Black has zero legal replies while in check → immediate checkmate (result recorded as checkmate by ban).
- PGN annotated line: `4. Qxf7+ {banning: e8f7} 1-0`

## 6 — Parsing & implementation notes for an LLM

- **Ban semantics are strict equality on squares** (string match of `from` and `to`). Do not try to canonicalize by algebraic notation variants — use lower-case file + digit rank (`a1`..`h8`).
- **Bans are mandatory**; the banning player must always supply a valid `from->to` pair that corresponds to at least one move in the opponent's `legalMoves` set (implementations may allow illegal/irrelevant bans to be rejected).
- **Bans persist only for the upcoming move** (they are single-turn filters). If the same `from->to` later reappears in the opponent's legal moves, it must be banned again explicitly.
- **Promotion handling:** all promotions matching the `from->to` pair are removed (regardless of promoted piece choice).
- **En passant / special cases:** treat the ephemeral move as any other `from->to` pair; if it matches the ban it is removed.

---

If you want, I can also produce (pick one):

- a) exact PGN transcript using your `ban-chess.ts` types, or
- b) a one-paragraph README blurb ready to paste into your repo, or
- c) a minimal JSON schema for `Move`, `Ban`, `GameState`.

Pick a letter and I’ll output it directly into this canvas or as a separate file.
