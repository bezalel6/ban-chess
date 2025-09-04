/**
 * Utilities for working with standardized chess result notation
 */

/**
 * Get user-friendly display text for a standardized chess result
 * @param result - Standard chess notation (1-0, 0-1, 1/2-1/2)
 * @param resultReason - Optional reason for the result
 * @param winner - Optional winner specification
 */
export function getResultDisplayText(
  result: string,
  resultReason?: string,
  winner?: "white" | "black"
): string {
  // Handle draws first
  if (result === "1/2-1/2") {
    if (resultReason === "stalemate") {
      return "Draw by stalemate";
    }
    return "Game drawn";
  }

  // Determine winner from result if not provided
  if (!winner) {
    if (result === "1-0") {
      winner = "white";
    } else if (result === "0-1") {
      winner = "black";
    } else {
      return "Game over";
    }
  }

  const winnerText = winner === "white" ? "White" : "Black";
  
  // Add reason if available
  switch (resultReason) {
    case "checkmate":
      return `${winnerText} wins by checkmate!`;
    case "resignation":
      return `${winnerText} wins by resignation`;
    case "timeout":
      return `${winnerText} wins on time!`;
    default:
      return `${winnerText} wins`;
  }
}

/**
 * Check if a result is a win for a specific color
 */
export function isWin(result: string, color: "white" | "black"): boolean {
  if (color === "white") {
    return result === "1-0";
  } else {
    return result === "0-1";
  }
}

/**
 * Check if a result is a draw
 */
export function isDraw(result: string): boolean {
  return result === "1/2-1/2";
}

/**
 * Get the winner from a standardized result
 */
export function getWinner(result: string): "white" | "black" | null {
  if (result === "1-0") return "white";
  if (result === "0-1") return "black";
  return null;
}