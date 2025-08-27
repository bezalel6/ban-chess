import { Page } from '@playwright/test';

interface BoardInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  flipped?: boolean;
}

/**
 * Get board information including position and orientation
 */
export async function getBoardInfo(page: Page): Promise<BoardInfo> {
  return await page.evaluate(() => {
    // The actual chessground board is .cg-wrap, not .cg-board
    const board = document.querySelector('.cg-wrap') as HTMLElement;
    
    if (!board) {
      // Fallback to chess-board-container if cg-wrap doesn't exist
      const container = document.querySelector('.chess-board-container') as HTMLElement;
      if (!container) {
        throw new Error('Chess board not found. Tried .cg-wrap and .chess-board-container');
      }
      
      // Use the container dimensions
      const rect = container.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        flipped: false,
      };
    }
    
    const rect = board.getBoundingClientRect();
    
    // Check if board is flipped by looking at the wrap classes
    const isFlipped = board.classList.contains('orientation-black') || false;
    
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      flipped: isFlipped,
    };
  });
}

/**
 * Convert chess square notation to pixel coordinates
 * @param square Chess square notation (e.g., 'e4', 'a1')
 * @param boardInfo Board position and dimensions
 * @returns x,y coordinates for the center of the square
 */
export function squareToXY(square: string, boardInfo: BoardInfo): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97; // a=0, b=1, ..., h=7
  const rank = parseInt(square[1], 10) - 1; // 1=0, 2=1, ..., 8=7
  const squareSize = boardInfo.width / 8;
  
  let filePos: number;
  let rankPos: number;
  
  if (boardInfo.flipped) {
    // Black perspective: files are reversed, ranks are reversed
    filePos = 7 - file;
    rankPos = rank;
  } else {
    // White perspective: normal
    filePos = file;
    rankPos = 7 - rank;
  }
  
  return {
    x: boardInfo.x + filePos * squareSize + squareSize / 2,
    y: boardInfo.y + rankPos * squareSize + squareSize / 2,
  };
}

/**
 * Click on a chess square using coordinate-based clicking
 * @param page Playwright page object
 * @param square Chess square notation (e.g., 'e4', 'a1')
 */
export async function clickSquare(page: Page, square: string): Promise<void> {
  const boardInfo = await getBoardInfo(page);
  const { x, y } = squareToXY(square, boardInfo);
  
  // Move to position and click (more reliable than direct click)
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  
  // Small delay to let the board process the click
  await page.waitForTimeout(100);
}

/**
 * Check if a piece is selected and showing valid moves
 * @param page Playwright page object
 * @returns true if a piece is selected
 */
export async function isPieceSelected(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const wrap = document.querySelector('.cg-wrap');
    if (!wrap) return false;
    
    // Check for selected square or move destinations
    const selectedSquare = wrap.querySelector('square.selected');
    const moveDestSquares = wrap.querySelectorAll('square.move-dest');
    
    // During ban phase, check for ban phase indicators
    const banSquares = wrap.querySelectorAll('square.ban-dest, square.premove-dest');
    
    return !!selectedSquare || moveDestSquares.length > 0 || banSquares.length > 0;
  });
}

/**
 * Check if a specific square is a valid move destination
 * @param page Playwright page object
 * @param square Square to check (e.g., 'e4')
 * @param boardInfo Board information
 * @returns true if the square is a valid move destination
 */
async function isValidMoveDestination(page: Page, square: string, boardInfo: BoardInfo): Promise<boolean> {
  const { x, y } = squareToXY(square, boardInfo);
  
  return await page.evaluate(({ x, y }) => {
    const wrap = document.querySelector('.cg-wrap');
    if (!wrap) return false;
    
    // Get all move destination squares
    const moveDestSquares = wrap.querySelectorAll('square.move-dest');
    
    // Check if any of them are at the target position
    for (const destSquare of moveDestSquares) {
      const style = (destSquare as HTMLElement).style.transform;
      if (style) {
        // Parse transform: translate(Xpx, Ypx)
        const match = style.match(/translate\(([0-9.]+)px,\s*([0-9.]+)px\)/);
        if (match) {
          const squareX = parseFloat(match[1]);
          const squareY = parseFloat(match[2]);
          // Check if this square is at our target position (with small tolerance)
          if (Math.abs(squareX - (x - wrap.getBoundingClientRect().left)) < 5 &&
              Math.abs(squareY - (y - wrap.getBoundingClientRect().top)) < 5) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, { x, y });
}

/**
 * Make a chess move by clicking two squares
 * @param page Playwright page object
 * @param from Source square (e.g., 'e2')
 * @param to Destination square (e.g., 'e4')
 */
export async function makeMove(page: Page, from: string, to: string): Promise<void> {
  const boardInfo = await getBoardInfo(page);
  
  // Click the source square
  await clickSquare(page, from);
  await page.waitForTimeout(200);
  
  // Verify the piece is selected
  const isSelected = await isPieceSelected(page);
  if (!isSelected) {
    console.log(`Warning: Piece at ${from} may not be selected. Retrying...`);
    await page.waitForTimeout(200);
    await clickSquare(page, from);
    await page.waitForTimeout(200);
    
    // Check again
    const isSelectedRetry = await isPieceSelected(page);
    if (!isSelectedRetry) {
      console.log(`ERROR: Cannot select piece at ${from}. Move may be invalid or banned.`);
      return;
    }
  }
  
  // Check if the destination is a valid move
  const isValidDest = await isValidMoveDestination(page, to, boardInfo);
  if (!isValidDest) {
    console.log(`ERROR: ${to} is not a valid move destination for piece at ${from}`);
    // Click elsewhere to deselect
    await clickSquare(page, from);
    return;
  }
  
  // Make the move
  await clickSquare(page, to);
  
  // Wait for the move animation to complete
  await page.waitForTimeout(300);
}

/**
 * Ban a move by clicking two squares (during ban phase)
 * @param page Playwright page object
 * @param from Source square of the move to ban
 * @param to Destination square of the move to ban
 */
export async function banMove(page: Page, from: string, to: string): Promise<void> {
  // During ban phase, simply click the two squares without validation
  // because we're selecting opponent's pieces and their possible moves
  await clickSquare(page, from);
  await page.waitForTimeout(200);
  await clickSquare(page, to);
  await page.waitForTimeout(300);
}

/**
 * Wait for it to be player's turn
 * @param page Playwright page object
 * @param color Expected player color ('white' or 'black')
 */
export async function waitForTurn(page: Page, color?: 'white' | 'black'): Promise<void> {
  // Wait for turn indicator to show it's our turn
  const turnSelector = color 
    ? `text=/${color} to (move|ban)/i`
    : 'text=/Your turn/i';
  
  await page.waitForSelector(turnSelector, { 
    timeout: 10000,
    state: 'visible'
  });
}

/**
 * Check if game is over
 * @param page Playwright page object
 * @returns true if game has ended
 */
export async function isGameOver(page: Page): Promise<boolean> {
  const gameOverTexts = [
    'checkmate',
    'stalemate',
    'draw',
    'wins',
    'game over'
  ];
  
  for (const text of gameOverTexts) {
    const element = await page.locator(`text=/${text}/i`).first();
    if (await element.isVisible().catch(() => false)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the current FEN position from the board
 * @param page Playwright page object
 * @returns FEN string or null if not available
 */
export async function getCurrentFEN(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    // Try to get FEN from various possible sources
    // Some chess apps expose it in data attributes or window objects
    const board = document.querySelector('.cg-wrap') as HTMLElement & { __chessground?: { getFen: () => string } };
    if (board && board.__chessground) {
      return board.__chessground.getFen();
    }
    
    // Try to find it in any debug or info elements
    const fenElement = document.querySelector('[data-fen]');
    if (fenElement) {
      return fenElement.getAttribute('data-fen');
    }
    
    return null;
  });
}