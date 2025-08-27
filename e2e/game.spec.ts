import { test, expect } from './fixtures/test';
import { generateTestUsername, waitForWebSocketConnection, mockGameMatch } from './utils/test-helpers';

test.describe('Chess Game', () => {
  test.beforeEach(async ({ page, authPage }) => {
    await page.goto('/');
    
    // Set up user authentication
    const username = generateTestUsername('chess');
    await authPage.setUsername(username);
    await authPage.waitForLogin();
    
    // Wait for WebSocket connection
    await waitForWebSocketConnection(page);
  });

  test('should join game queue', async ({ chessPage, page }) => {
    // Join queue
    await chessPage.joinQueue();
    
    // Verify queue status
    const queueStatus = page.locator('[data-testid="queue-status"]');
    await expect(queueStatus).toContainText(/waiting|in queue/i);
    
    // Verify leave queue button is visible
    await expect(chessPage.leaveQueueButton).toBeVisible();
  });

  test('should leave game queue', async ({ chessPage, page }) => {
    // Join queue
    await chessPage.joinQueue();
    await expect(chessPage.leaveQueueButton).toBeVisible();
    
    // Leave queue
    await chessPage.leaveQueue();
    
    // Verify queue status
    const queueStatus = page.locator('[data-testid="queue-status"]');
    await expect(queueStatus).not.toContainText(/waiting|in queue/i);
    
    // Verify join queue button is visible again
    await expect(chessPage.queueButton).toBeVisible();
  });

  test('should display chess board when game starts', async ({ chessPage, page }) => {
    // Join queue
    await chessPage.joinQueue();
    
    // Mock game match
    await mockGameMatch(page, 'opponent');
    
    // Wait for game to start
    await chessPage.waitForGameStart();
    
    // Verify board is visible
    await expect(chessPage.board).toBeVisible();
    
    // Verify player turn indicator
    await expect(chessPage.playerTurn).toBeVisible();
  });

  test('should make a valid chess move', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Wait for white's turn
    await chessPage.waitForTurn('white');
    
    // Make a move
    await chessPage.makeMove('e2e4');
    
    // Verify move appears in history
    const moveHistory = await chessPage.getMoveHistory();
    expect(moveHistory).toContain('e2e4');
  });

  test('should reject invalid chess move', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Wait for turn
    await chessPage.waitForTurn('white');
    
    // Try invalid move
    await chessPage.makeMove('e2e5'); // Invalid pawn move
    
    // Check for error message
    const errorMessage = page.locator('[data-testid="move-error"]');
    await expect(errorMessage).toContainText(/invalid move/i);
  });

  test('should ban a word', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Ban a word
    await chessPage.banWord('knight');
    
    // Verify word appears in banned list
    const bannedWords = await chessPage.getBannedWords();
    expect(bannedWords).toContain('knight');
  });

  test('should reject move containing banned word', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Ban a letter that would be in a move
    await chessPage.banWord('e');
    
    // Try to make a move containing the banned letter
    await chessPage.makeMove('e2e4');
    
    // Check for error message
    const errorMessage = page.locator('[data-testid="move-error"]');
    await expect(errorMessage).toContainText(/banned/i);
  });

  test('should display timer', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Verify timer is visible
    await expect(chessPage.timer).toBeVisible();
    
    // Verify timer shows time
    const timerText = await chessPage.timer.textContent();
    expect(timerText).toMatch(/\d+:\d+/);
  });

  test('should allow resignation', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Resign
    await chessPage.resign();
    
    // Confirm resignation in dialog
    const confirmButton = page.locator('button:has-text("Confirm")');
    await confirmButton.click();
    
    // Check game status
    const gameStatus = await chessPage.getGameStatus();
    expect(gameStatus).toContain('resigned');
  });

  test('should show game over state', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Simulate game over
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ws-message', {
        detail: {
          type: 'gameOver',
          data: {
            winner: 'white',
            reason: 'checkmate'
          }
        }
      }));
    });
    
    // Check game status
    const gameStatus = await chessPage.getGameStatus();
    expect(gameStatus).toContain(/game over|checkmate/i);
    
    // Check for rematch button
    const rematchButton = page.locator('button:has-text("Rematch")');
    await expect(rematchButton).toBeVisible();
  });

  test('should handle draw offer', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Offer draw
    const drawButton = page.locator('button:has-text("Offer Draw")');
    await drawButton.click();
    
    // Check for confirmation
    const drawStatus = page.locator('[data-testid="draw-status"]');
    await expect(drawStatus).toContainText(/draw offered/i);
  });

  test('should display move notation correctly', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Make several moves
    const moves = ['e2e4', 'd2d4', 'g1f3'];
    
    for (const move of moves) {
      await chessPage.waitForTurn('white');
      await chessPage.makeMove(move);
      
      // Verify move in history
      const history = await chessPage.getMoveHistory();
      expect(history.some(h => h.includes(move))).toBe(true);
    }
  });

  test('should show captured pieces', async ({ chessPage, page }) => {
    // Setup game
    await chessPage.joinQueue();
    await mockGameMatch(page, 'opponent');
    await chessPage.waitForGameStart();
    
    // Simulate a capture
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ws-message', {
        detail: {
          type: 'pieceCaptured',
          data: {
            piece: 'pawn',
            color: 'black'
          }
        }
      }));
    });
    
    // Check captured pieces display
    const capturedPieces = page.locator('[data-testid="captured-pieces"]');
    await expect(capturedPieces).toBeVisible();
    await expect(capturedPieces).toContainText(/pawn/i);
  });
});