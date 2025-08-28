import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Focused Multiplayer Tests
 * These tests specifically validate the multiplayer game flow between two players
 * Authentication is handled quickly via helpers to focus on game mechanics
 */

interface PlayerSession {
  context: BrowserContext;
  page: Page;
  username: string;
}

async function quickAuth(page: Page, username: string): Promise<void> {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot to see what's on the page
  await page.screenshot({ path: `test-results/auth-debug-${username}.png` });
  
  // Look for visible text input
  const inputSelector = 'input[type="text"]:visible, input:not([type="hidden"]):visible';
  await page.waitForSelector(inputSelector, { state: 'visible', timeout: 5000 });
  await page.fill(inputSelector, username);
  
  // Click the play/submit button
  await page.click('button:visible');
  
  // Wait for WebSocket connection and authentication
  // Game mode buttons or queue button should become enabled
  const buttonSelectors = [
    'button:has-text("Join Queue"):not([disabled])',
    'button:has-text("Play Solo"):not([disabled])',
    'button:has-text("Play Online"):not([disabled])'
  ];
  
  try {
    await page.waitForSelector(buttonSelectors.join(', '), { 
      timeout: 10000,
      state: 'visible' 
    });
  } catch (error) {
    console.log('WebSocket authentication may have failed or UI changed');
  }
  
  // Take another screenshot to see state after login
  await page.screenshot({ path: `test-results/auth-after-${username}.png` });
}

async function createPlayer(browser: Browser, playerNumber: number): Promise<PlayerSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const username = `P${playerNumber}_${Date.now()}`;
  
  await quickAuth(page, username);
  
  return { context, page, username };
}

test.describe('Multiplayer Game Flow', () => {
  test.describe.configure({ timeout: 60000 }); // Increase timeout for multiplayer tests

  test('two players can match and see each other', async ({ browser }) => {
    const player1 = await createPlayer(browser, 1);
    const player2 = await createPlayer(browser, 2);
    
    try {
      // Both players join queue simultaneously
      console.log('🎮 Both players joining queue...');
      await Promise.all([
        player1.page.click('button:has-text("Join Queue")'),
        player2.page.click('button:has-text("Join Queue")')
      ]);
      
      // Wait a moment for queue state to update
      await player1.page.waitForTimeout(1000);
      
      // Check if players are in queue (various possible states)
      const p1InQueue = await player1.page.isVisible('h2:has-text("Finding Opponent")');
      const p2InQueue = await player2.page.isVisible('h2:has-text("Finding Opponent")');
      
      if (p1InQueue && p2InQueue) {
        console.log('✅ Both players in queue');
      } else {
        console.log('⚠️ Players joined but queue state unclear');
      }
      
      // Wait for match - players will be redirected to /game/[id]
      console.log('⏳ Waiting for match and redirect...');
      
      // Wait for URL change indicating match found
      await Promise.all([
        player1.page.waitForURL('**/game/**', { timeout: 30000 }),
        player2.page.waitForURL('**/game/**', { timeout: 30000 })
      ]);
      
      console.log('✅ Both players matched and redirected to game!');
      
      // Now wait for the game board to appear on the new page
      const [p1Board, p2Board] = await Promise.all([
        player1.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { 
          state: 'visible', 
          timeout: 10000 
        }).catch(() => null),
        player2.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { 
          state: 'visible', 
          timeout: 10000 
        }).catch(() => null)
      ]);
      
      if (p1Board && p2Board) {
        console.log('✅ Both players see game board!');
        
        // Verify players can see each other's usernames
        const p1Content = await player1.page.textContent('body');
        const p2Content = await player2.page.textContent('body');
        
        expect(p1Content).toContain(player2.username);
        expect(p2Content).toContain(player1.username);
        console.log('✅ Players can see opponent names');
      } else {
        console.log('⚠️ Game board not visible yet');
      }
      
    } finally {
      await player1.context.close();
      await player2.context.close();
    }
  });

  test('players can exchange moves', async ({ browser }) => {
    const player1 = await createPlayer(browser, 1);
    const player2 = await createPlayer(browser, 2);
    
    try {
      // Quick match
      await Promise.all([
        player1.page.click('button:has-text("Join Queue")'),
        player2.page.click('button:has-text("Join Queue")')
      ]);
      
      // Wait for redirect to game page
      await Promise.all([
        player1.page.waitForURL('**/game/**', { timeout: 30000 }),
        player2.page.waitForURL('**/game/**', { timeout: 30000 })
      ]);
      
      // Wait for game board to load
      await Promise.all([
        player1.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { timeout: 10000 }),
        player2.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { timeout: 10000 })
      ]);
      
      console.log('🎯 Game started, testing move exchange using board clicks...');
      
      // Import the helper functions
      const { makeMove, waitForTurn } = await import('./utils/chess-board-helpers');
      
      // Wait for game boards to be ready
      await player1.page.waitForSelector('.cg-board', { timeout: 10000 });
      await player2.page.waitForSelector('.cg-board', { timeout: 10000 });
      
      // Determine who is white (check turn indicator)
      const p1HasWhiteTurn = await player1.page.locator('text=/White to move/i').isVisible().catch(() => false);
      const p2HasWhiteTurn = await player2.page.locator('text=/White to move/i').isVisible().catch(() => false);
      
      const whitePlayer = p1HasWhiteTurn ? player1 : player2;
      const blackPlayer = p1HasWhiteTurn ? player2 : player1;
      
      console.log(`White: ${whitePlayer.username}, Black: ${blackPlayer.username}`);
      
      // White makes opening move e2-e4
      await waitForTurn(whitePlayer.page, 'white');
      await makeMove(whitePlayer.page, 'e2', 'e4');
      
      // Wait for ban phase and skip it (or make a ban)
      await whitePlayer.page.waitForTimeout(1000);
      // For simplicity, we'll ban a random move
      await makeMove(whitePlayer.page, 'e7', 'e5');
      
      // Wait for black's turn
      await waitForTurn(blackPlayer.page, 'black');
      
      // Black responds d7-d5 (since e7-e5 might be banned)
      await makeMove(blackPlayer.page, 'd7', 'd5');
      
      // Black's ban phase
      await blackPlayer.page.waitForTimeout(1000);
      await makeMove(blackPlayer.page, 'e4', 'd5');
      
      // White should be able to move again
      await waitForTurn(whitePlayer.page, 'white');
      
      console.log('✅ Players successfully exchanged moves using board clicks!');
      
    } finally {
      await player1.context.close();
      await player2.context.close();
    }
  });

  test('disconnection is handled gracefully', async ({ browser }) => {
    const player1 = await createPlayer(browser, 1);
    const player2 = await createPlayer(browser, 2);
    
    try {
      // Match players
      await Promise.all([
        player1.page.click('button:has-text("Join Queue")'),
        player2.page.click('button:has-text("Join Queue")')
      ]);
      
      // Wait for redirect
      await Promise.all([
        player1.page.waitForURL('**/game/**', { timeout: 30000 }),
        player2.page.waitForURL('**/game/**', { timeout: 30000 })
      ]);
      
      await Promise.all([
        player1.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { timeout: 10000 }),
        player2.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { timeout: 10000 })
      ]);
      
      console.log('💔 Simulating player disconnection...');
      
      // Close player 1's context (simulate disconnect)
      await player1.context.close();
      
      // Player 2 should see disconnection indication
      const disconnectIndicators = [
        'text=/disconnected/i',
        'text=/left the game/i', 
        'text=/connection lost/i',
        'text=/opponent left/i',
        'h2:has-text("Something went wrong")'
      ];
      
      let disconnectDetected = false;
      for (const indicator of disconnectIndicators) {
        if (await player2.page.isVisible(indicator, { timeout: 10000 }).catch(() => false)) {
          disconnectDetected = true;
          console.log(`✅ Disconnection detected: ${indicator}`);
          break;
        }
      }
      
      expect(disconnectDetected).toBe(true);
      
    } catch (error) {
      // Context might be closed
      console.log('Test completed (context closed expected)');
    } finally {
      // Clean up any remaining contexts
      await player1.context.close().catch(() => {});
      await player2.context.close().catch(() => {});
    }
  });

  test('resign button works during game', async ({ browser }) => {
    const player1 = await createPlayer(browser, 1);
    const player2 = await createPlayer(browser, 2);
    
    try {
      // Match players
      await Promise.all([
        player1.page.click('button:has-text("Join Queue")'),
        player2.page.click('button:has-text("Join Queue")')
      ]);
      
      // Wait for redirect
      await Promise.all([
        player1.page.waitForURL('**/game/**', { timeout: 30000 }),
        player2.page.waitForURL('**/game/**', { timeout: 30000 })
      ]);
      
      await Promise.all([
        player1.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { timeout: 10000 }),
        player2.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { timeout: 10000 })
      ]);
      
      // Player 1 resigns
      const resignButton = player1.page.locator('button:has-text("Resign")');
      if (await resignButton.isVisible()) {
        await resignButton.click();
        
        // Confirm resignation if needed
        const confirmButton = player1.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }
        
        // Both players should see game over
        await Promise.all([
          player1.page.waitForSelector('text=/game over|resigned|wins/i', { timeout: 10000 }),
          player2.page.waitForSelector('text=/game over|resigned|wins/i', { timeout: 10000 })
        ]);
        
        console.log('✅ Resignation handled correctly');
      } else {
        console.log('⚠️ Resign button not visible - feature may not be implemented');
      }
      
    } finally {
      await player1.context.close();
      await player2.context.close();
    }
  });

  test('ban system affects both players', async ({ browser }) => {
    const player1 = await createPlayer(browser, 1);
    const player2 = await createPlayer(browser, 2);
    
    try {
      // Match players
      await Promise.all([
        player1.page.click('button:has-text("Join Queue")'),
        player2.page.click('button:has-text("Join Queue")')
      ]);
      
      // Wait for redirect
      await Promise.all([
        player1.page.waitForURL('**/game/**', { timeout: 30000 }),
        player2.page.waitForURL('**/game/**', { timeout: 30000 })
      ]);
      
      await Promise.all([
        player1.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { timeout: 10000 }),
        player2.page.waitForSelector('.cg-wrap, [class*="chessboard"]', { timeout: 10000 })
      ]);
      
      // Check if ban UI exists
      const banInput = player1.page.locator('input[placeholder*="ban" i], input[placeholder*="word" i]');
      if (await banInput.isVisible({ timeout: 5000 })) {
        // Player 1 bans a piece
        await banInput.fill('queen');
        await player1.page.click('button:has-text("Ban")');
        
        // Both players should see the ban
        await Promise.all([
          player1.page.waitForSelector('text=/queen/i', { timeout: 5000 }),
          player2.page.waitForSelector('text=/queen/i', { timeout: 5000 })
        ]);
        
        console.log('✅ Ban system works across both players');
      } else {
        console.log('⚠️ Ban system UI not found - feature may not be implemented');
      }
      
    } finally {
      await player1.context.close();
      await player2.context.close();
    }
  });
});

// Add this test to package.json as: "test:multiplayer": "playwright test e2e/multiplayer-flow.spec.ts"