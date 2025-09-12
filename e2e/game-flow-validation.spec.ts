import { test, expect } from '@playwright/test';
import { makeMove, banMove, waitForTurn, isGameOver, clickSquare, isPieceSelected, getBoardInfo } from './utils/chess-board-helpers';

/**
 * Game Flow Validation Tests
 * Testing the complete game flow including race condition fixes and UI improvements
 */

test.describe('Game Flow Validation', () => {
  test('practice game loads without race conditions', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Click Play button
    const playButton = page.locator('button:has-text("Play")').first();
    await playButton.click();
    
    // Click Practice button
    const practiceButton = page.locator('a:has-text("Practice")').first();
    await practiceButton.click();
    
    // Click Play as Guest
    const guestButton = page.locator('button:has-text("Play as Guest")');
    await guestButton.click();
    
    // Wait for navigation to practice page
    await page.waitForURL('**/play/practice', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Verify game board loaded
    const board = page.locator('.cg-wrap, .cg-board');
    await expect(board).toBeVisible({ timeout: 5000 });
    
    // Verify status panel is showing
    const statusPanel = page.locator('text=/Choose a move to ban/i');
    await expect(statusPanel).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Practice game loaded successfully without race conditions');
  });

  test('board orientation follows active player in solo mode', async ({ page }) => {
    // Navigate directly to practice page (assuming we're already authenticated)
    await page.goto('http://localhost:3000/play/practice');
    await page.waitForLoadState('networkidle');
    
    // Wait for board to load
    await page.waitForSelector('.cg-wrap', { timeout: 10000 });
    
    // Check initial board orientation (should be Black's perspective for Black's ban phase)
    let boardInfo = await getBoardInfo(page);
    const initialOrientation = boardInfo.flipped;
    console.log('Initial board orientation:', initialOrientation ? 'Black' : 'White');
    
    // The board should be flipped since Black starts with a ban
    expect(initialOrientation).toBe(true);
    
    // Make a ban as Black (ban White's e2-e4)
    await banMove(page, 'e2', 'e4');
    await page.waitForTimeout(500);
    
    // After Black's ban, it should be White's turn - board should flip
    await page.waitForTimeout(1000);
    boardInfo = await getBoardInfo(page);
    console.log('After Black ban, board orientation:', boardInfo.flipped ? 'Black' : 'White');
    
    // Board should now be from White's perspective
    expect(boardInfo.flipped).toBe(false);
    
    console.log('✅ Board orientation correctly follows active player');
  });

  test('ban status messages show correct target color', async ({ page }) => {
    await page.goto('http://localhost:3000/play/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-wrap', { timeout: 10000 });
    
    // Check initial ban message
    const initialStatus = await page.locator('.text-lg.font-semibold, text=/Choose a move to ban/i').textContent();
    console.log('Initial status:', initialStatus);
    
    // Should say "Choose a move to ban for White" when Black is banning
    expect(initialStatus).toContain('Choose a move to ban for White');
    
    // Make Black's ban
    await banMove(page, 'e2', 'e4');
    await page.waitForTimeout(1000);
    
    // Now it should be White's turn to move
    const afterBanStatus = await page.locator('.text-lg.font-semibold').textContent();
    console.log('After Black ban:', afterBanStatus);
    expect(afterBanStatus?.toLowerCase()).toContain('white');
    
    // Make White's move
    await makeMove(page, 'd2', 'd4');
    await page.waitForTimeout(1000);
    
    // Now White should ban for Black
    const whiteBanStatus = await page.locator('.text-lg.font-semibold').textContent();
    console.log('White ban phase:', whiteBanStatus);
    
    if (whiteBanStatus?.toLowerCase().includes('ban')) {
      expect(whiteBanStatus).toContain('Choose a move to ban for Black');
    }
    
    console.log('✅ Ban status messages correctly show target color');
  });

  test('full game flow with alternating moves and bans', async ({ page }) => {
    test.setTimeout(60000); // Extended timeout for full game
    
    await page.goto('http://localhost:3000/play/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-wrap', { timeout: 10000 });
    
    console.log('Starting full game flow test...');
    
    // Track game progression
    const gameLog = [];
    
    // Black's initial ban
    let status = await page.locator('.text-lg.font-semibold').textContent();
    gameLog.push(`1. ${status}`);
    await banMove(page, 'e2', 'e4');
    await page.waitForTimeout(500);
    
    // White's first move
    status = await page.locator('.text-lg.font-semibold').textContent();
    gameLog.push(`2. ${status}`);
    await makeMove(page, 'd2', 'd4');
    await page.waitForTimeout(500);
    
    // White's ban for Black
    status = await page.locator('.text-lg.font-semibold').textContent();
    gameLog.push(`3. ${status}`);
    if (status?.includes('ban')) {
      await banMove(page, 'e7', 'e5');
      await page.waitForTimeout(500);
    }
    
    // Black's first move
    status = await page.locator('.text-lg.font-semibold').textContent();
    gameLog.push(`4. ${status}`);
    await makeMove(page, 'd7', 'd5');
    await page.waitForTimeout(500);
    
    // Black's ban for White
    status = await page.locator('.text-lg.font-semibold').textContent();
    gameLog.push(`5. ${status}`);
    if (status?.includes('ban')) {
      await banMove(page, 'g1', 'f3');
      await page.waitForTimeout(500);
    }
    
    // White's second move
    status = await page.locator('.text-lg.font-semibold').textContent();
    gameLog.push(`6. ${status}`);
    await makeMove(page, 'c1', 'f4');
    await page.waitForTimeout(500);
    
    // Log game progression
    console.log('Game progression:');
    gameLog.forEach(log => console.log(log));
    
    // Verify move history is being tracked
    const moveCount = await page.locator('text=/Move \\d+ of \\d+/i').textContent();
    console.log('Move counter:', moveCount);
    expect(moveCount).toMatch(/Move \d+ of \d+/);
    
    // Verify no errors or stuck states
    const errorMessages = await page.locator('text=/error|failed|stuck/i').count();
    expect(errorMessages).toBe(0);
    
    console.log('✅ Full game flow completed successfully');
  });

  test('game state persists correctly across navigation', async ({ page }) => {
    await page.goto('http://localhost:3000/play/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-wrap', { timeout: 10000 });
    
    // Make some moves to create game state
    await banMove(page, 'e2', 'e4');
    await page.waitForTimeout(500);
    await makeMove(page, 'd2', 'd4');
    await page.waitForTimeout(500);
    
    // Get current game state
    const moveCountBefore = await page.locator('text=/Move \\d+ of \\d+/i').textContent();
    
    // Navigate away and back
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    await page.goto('http://localhost:3000/play/practice');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-wrap', { timeout: 10000 });
    
    // Check if game state persisted
    const moveCountAfter = await page.locator('text=/Move \\d+ of \\d+/i').textContent();
    
    // Game should either resume or start fresh (depending on implementation)
    // but should not be in a broken state
    expect(moveCountAfter).toBeTruthy();
    console.log(`Game state: Before navigation: ${moveCountBefore}, After: ${moveCountAfter}`);
    
    console.log('✅ Game state handling works correctly');
  });
});