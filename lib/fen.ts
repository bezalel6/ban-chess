export type Color = "w" | "b";
export interface CustomFen {
  standardFen: string;
  playerToMove: Color;
  action: "move" | "ban";
  actionTaker: Color;
}

/**
 * Parses a custom FEN string with an appended action state (e.g., "w:ban").
 * @param customFenString The FEN string to parse.
 * @returns A parsed CustomFen object.
 */
export function parseCustomFen(customFenString: string): CustomFen {
  const parts = customFenString.split(" ");
  if (parts.length < 6) {
    throw new Error("Invalid FEN string: not enough parts.");
  }

  // The standard FEN is the first 6 parts.
  const standardFen = parts.slice(0, 6).join(" ");
  const playerToMove = parts[1] as Color; // 'w' or 'b'

  let action: "move" | "ban" = "move";
  let actionTaker: Color = playerToMove;

  // Check for our custom 7th part for the ban state.
  if (parts.length > 6) {
    const customPart = parts[6];
    const [taker, customAction] = customPart.split(":");
    if (customAction === "ban" && (taker === "w" || taker === "b")) {
      action = "ban";
      actionTaker = taker as Color;
    }
  }

  return { standardFen, playerToMove, action, actionTaker };
}
