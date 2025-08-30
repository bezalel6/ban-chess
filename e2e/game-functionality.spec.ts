import { test, expect, Page } from '@playwright/test';

/**
 * Game Functionality Tests using Playwright MCP Tools
 * This test uses the Playwright MCP browser automation tools to test the solo game flow
 * without page refreshes and verify all the key functionality works correctly.
 */

test.describe('Game Functionality with Browser Automation', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(150000); // 2.5 minutes for complex flow

    // Navigate to application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Handle authentication flow
    await handleAuthentication(page);
  });

  test('complete solo game flow with state verification', async ({ page }) => {
    console.log('🎯 Starting complete solo game flow test...');

    // Step 1: Start solo game
    console.log('📝 Step 1: Starting solo game...');
    await page.screenshot({ path: 'test-results/game-func-step-1-home.png' });

    // Look for the Play Solo button (could be "Play Solo" or "Play Solo (Practice)")
    const playSoloButton = page
      .locator('button')
      .filter({ hasText: /Play Solo/ })
      .first();
    await expect(playSoloButton).toBeVisible({ timeout: 10000 });
    await playSoloButton.click();

    // Wait for game page
    await page.waitForURL('**/game/**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-wrap, .chess-board-container', {
      timeout: 15000,
    });

    console.log('✅ Solo game started successfully');
    await page.screenshot({
      path: 'test-results/game-func-step-2-game-started.png',
    });

    // Step 2: Verify initial state
    console.log('📊 Step 2: Verifying initial game state...');

    const gameState = await captureGameState(page);
    console.log('Initial game state:', gameState);

    // Verify this is indeed a solo game and state is valid
    expect(gameState.status).toBeDefined();
    expect(gameState.status).not.toContain('undefined');
    expect(gameState.status).not.toBe('');

    // Step 3: Execute complete game sequence
    console.log('🎮 Step 3: Executing complete game sequence...');

    let currentStatus = gameState.status;
    let actionCount = 0;
    const maxActions = 12; // Enough for several rounds
    const actionLog: string[] = [];

    while (
      actionCount < maxActions &&
      !currentStatus.toLowerCase().includes('checkmate')
    ) {
      actionCount++;
      console.log(
        `\n🔄 Action ${actionCount}: Current status: "${currentStatus}"`
      );

      let success = false;
      let actionDescription = '';

      if (currentStatus.toLowerCase().includes('ban')) {
        // Handle ban phase
        const color = currentStatus.toLowerCase().includes('white')
          ? 'white'
          : 'black';
        console.log(`  🚫 ${color} is banning...`);
        success = await executeBanAction(page, color);
        actionDescription = `${color} ban`;
      } else if (currentStatus.toLowerCase().includes('move')) {
        // Handle move phase
        const color = currentStatus.toLowerCase().includes('white')
          ? 'white'
          : 'black';
        console.log(`  ♟️ ${color} is moving...`);
        success = await executeMoveAction(page, color);
        actionDescription = `${color} move`;
      } else {
        console.log(`  ❓ Unknown status: "${currentStatus}"`);
        break;
      }

      if (!success) {
        console.log(`  ❌ Failed to execute ${actionDescription}`);
        await page.screenshot({
          path: `test-results/game-func-failed-${actionCount}-${actionDescription.replace(' ', '-')}.png`,
        });
        break;
      }

      // Wait for state change
      await page.waitForTimeout(1000);

      // Verify no page refresh occurred
      const currentUrl = page.url();
      expect(currentUrl).toContain('/game/');
      console.log('  ✅ No page refresh detected');

      // Get updated status
      const newGameState = await captureGameState(page);
      const newStatus = newGameState.status;

      if (newStatus !== currentStatus) {
        console.log(`  🔄 Status changed: "${currentStatus}" → "${newStatus}"`);
        actionLog.push(`${actionDescription}: ${currentStatus} → ${newStatus}`);
        currentStatus = newStatus;
      } else {
        console.log(`  ⚠️ Status unchanged after ${actionDescription}`);
      }

      // Take screenshot after each action
      await page.screenshot({
        path: `test-results/game-func-action-${actionCount}-${actionDescription.replace(' ', '-')}.png`,
      });
    }

    // Step 4: Final verification
    console.log('\n📋 Step 4: Final verification...');
    console.log('Action log:', actionLog);

    // Verify we made meaningful progress
    expect(actionCount).toBeGreaterThan(2);
    expect(actionLog.length).toBeGreaterThan(1);

    // Verify we had both bans and moves
    const bans = actionLog.filter(log => log.includes('ban')).length;
    const moves = actionLog.filter(log => log.includes('move')).length;

    expect(bans).toBeGreaterThan(0);
    expect(moves).toBeGreaterThan(0);

    console.log(
      `✅ Game flow completed successfully! ${bans} bans, ${moves} moves, ${actionCount} total actions`
    );

    await page.screenshot({ path: 'test-results/game-func-final-state.png' });
  });

  test('verify no refresh needed for player actions', async ({ page }) => {
    console.log('🔄 Testing that no page refresh is needed...');

    // Start game
    const playSoloButton = page
      .locator('button')
      .filter({ hasText: /Play Solo/ })
      .first();
    await playSoloButton.click();
    await page.waitForURL('**/game/**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-wrap, .chess-board-container', {
      timeout: 15000,
    });

    const initialUrl = page.url();
    const initialNavigationId = await page.evaluate(
      () => performance.navigation.type
    );

    // Perform several actions
    for (let i = 0; i < 4; i++) {
      const gameState = await captureGameState(page);

      if (gameState.status.toLowerCase().includes('ban')) {
        await executeBanAction(
          page,
          gameState.status.toLowerCase().includes('white') ? 'white' : 'black'
        );
      } else {
        await executeMoveAction(
          page,
          gameState.status.toLowerCase().includes('white') ? 'white' : 'black'
        );
      }

      await page.waitForTimeout(500);

      // Verify URL hasn't changed (no refresh)
      const currentUrl = page.url();
      expect(currentUrl).toBe(initialUrl);

      // Verify no navigation occurred
      const currentNavigationId = await page.evaluate(
        () => performance.navigation.type
      );
      expect(currentNavigationId).toBe(initialNavigationId);
    }

    console.log('✅ No page refresh needed for any player actions!');
  });
});

// Helper functions
async function handleAuthentication(page: Page): Promise<void> {
  // Check if we need to sign in
  const signInLink = page
    .locator('a')
    .filter({ hasText: /Sign in/ })
    .first();

  if (await signInLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInLink.click();
    await page.waitForURL('**/auth/**', { timeout: 5000 });

    // Fill authentication form
    const usernameInput = page.locator('input').first();
    await usernameInput.waitFor({ timeout: 5000 });

    const uniqueUsername = `GameTest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await usernameInput.fill(uniqueUsername);

    // Submit form
    const submitButton = page
      .locator('button[type="submit"], button')
      .filter({ hasText: /Sign in|Play|Continue/ })
      .first();
    await submitButton.click();

    // Wait for redirect to home
    await page.waitForURL('**/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  }

  // Wait for game mode buttons to be available
  await page
    .waitForSelector('button')
    .filter({ hasText: /Play Solo/ })
    .first()
    .waitFor({ timeout: 15000 });
}

async function captureGameState(
  page: Page
): Promise<{ status: string; timestamp: number }> {
  const statusElement = page
    .locator(
      '.text-lg.font-semibold, .game-status, [data-testid="game-status"], .status'
    )
    .first();
  const status = await statusElement
    .textContent({ timeout: 5000 })
    .catch(() => 'Unknown Status');

  return {
    status: status?.trim() || 'Unknown Status',
    timestamp: Date.now(),
  };
}

async function executeBanAction(
  page: Page,
  color: 'white' | 'black'
): Promise<boolean> {
  // Common moves to ban based on color
  const banTargets =
    color === 'white'
      ? [
          // White bans Black moves
          { from: [4, 6], to: [4, 4] }, // e7-e5
          { from: [3, 6], to: [3, 4] }, // d7-d5
          { from: [6, 7], to: [5, 5] }, // g8-f6
          { from: [1, 7], to: [2, 5] }, // b8-c6
        ]
      : [
          // Black bans White moves
          { from: [4, 1], to: [4, 3] }, // e2-e4
          { from: [3, 1], to: [3, 3] }, // d2-d4
          { from: [6, 0], to: [5, 2] }, // g1-f3
          { from: [1, 0], to: [2, 2] }, // b1-c3
        ];

  for (const ban of banTargets) {
    try {
      // Click source square
      await clickBoardSquare(page, ban.from[0], ban.from[1]);
      await page.waitForTimeout(200);

      // Click destination square
      await clickBoardSquare(page, ban.to[0], ban.to[1]);
      await page.waitForTimeout(500);

      // Check if ban was successful by looking for status change
      const newState = await captureGameState(page);
      if (
        !newState.status.toLowerCase().includes('ban') ||
        !newState.status.toLowerCase().includes(color)
      ) {
        console.log(`    ✅ Ban successful: ${ban.from} → ${ban.to}`);
        return true;
      }
    } catch (error) {
      console.log(`    ❌ Ban failed: ${ban.from} → ${ban.to}:`, error);
    }
  }

  return false;
}

async function executeMoveAction(
  page: Page,
  color: 'white' | 'black'
): Promise<boolean> {
  // Common opening moves
  const moves = [
    { from: [4, 1], to: [4, 3] }, // e2-e4
    { from: [3, 1], to: [3, 3] }, // d2-d4
    { from: [6, 0], to: [5, 2] }, // g1-f3
    { from: [1, 0], to: [2, 2] }, // b1-c3
    { from: [4, 6], to: [4, 4] }, // e7-e5
    { from: [3, 6], to: [3, 4] }, // d7-d5
    { from: [6, 7], to: [5, 5] }, // g8-f6
    { from: [1, 7], to: [2, 5] }, // b8-c6
    { from: [5, 0], to: [2, 3] }, // f1-c4
    { from: [2, 0], to: [5, 3] }, // c1-f4
  ];

  for (const move of moves) {
    try {
      // Click source square
      await clickBoardSquare(page, move.from[0], move.from[1]);
      await page.waitForTimeout(200);

      // Check if piece is selected (look for highlighting or move destinations)
      const isSelected =
        (await page
          .locator('.cg-wrap square.selected, .cg-wrap square.move-dest')
          .count()) > 0;

      if (isSelected) {
        // Click destination square
        await clickBoardSquare(page, move.to[0], move.to[1]);
        await page.waitForTimeout(500);

        // Check if move was successful
        const newState = await captureGameState(page);
        if (
          !newState.status.toLowerCase().includes('move') ||
          !newState.status.toLowerCase().includes(color)
        ) {
          console.log(`    ✅ Move successful: ${move.from} → ${move.to}`);
          return true;
        }
      } else {
        // Piece not selected, try next move
        continue;
      }
    } catch (error) {
      console.log(`    ❌ Move failed: ${move.from} → ${move.to}:`, error);
    }
  }

  return false;
}

async function clickBoardSquare(
  page: Page,
  file: number,
  rank: number
): Promise<void> {
  // Convert file/rank to pixel coordinates
  const boardElement = page.locator('.cg-wrap, .chess-board-container').first();
  const box = await boardElement.boundingBox();

  if (!box) {
    throw new Error('Could not find chess board');
  }

  const squareSize = box.width / 8;
  const x = box.x + file * squareSize + squareSize / 2;
  const y = box.y + (7 - rank) * squareSize + squareSize / 2; // Flip rank for display

  await page.mouse.click(x, y);
}
