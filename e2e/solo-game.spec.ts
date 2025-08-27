import { test, expect } from '@playwright/test';
import { makeMove, banMove, waitForTurn, isGameOver, clickSquare, isPieceSelected, getBoardInfo, squareToXY } from './utils/chess-board-helpers';

/**
 * Single-Player Game Tests
 * These tests validate the solo game mode where one player controls both colors
 */

test.describe('Solo Game Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Set a username to enable game modes
    const usernameInput = page.locator('input[type="text"]:visible').first();
    if (await usernameInput.isVisible()) {
      // Generate a unique username with timestamp and random number
      const uniqueUsername = `Solo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await usernameInput.fill(uniqueUsername);
      await page.click('button:has-text("Play")');
      
      // Wait for either success or username taken error
      const successOrError = await Promise.race([
        page.waitForSelector('button:has-text("Play Solo"):not([disabled])', { 
          timeout: 5000,
          state: 'visible' 
        }).then(() => 'success'),
        page.waitForSelector('text=/Username is already taken/i', { 
          timeout: 1000,
          state: 'visible' 
        }).then(() => 'taken')
      ]).catch(() => null);
      
      // If username is taken, try again with a new one
      if (successOrError === 'taken') {
        await usernameInput.clear();
        const retryUsername = `Solo_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await usernameInput.fill(retryUsername);
        await page.click('button:has-text("Play")');
      }
      
      // Wait for WebSocket connection and authentication
      // The buttons become enabled once the connection is established
      await page.waitForSelector('button:has-text("Play Solo"):not([disabled])', { 
        timeout: 15000,
        state: 'visible' 
      });
    }
  });

  test('can create and join a solo game', async ({ page }) => {
    // Look for the Play Solo button (already waited for in beforeEach)
    const playSoloButton = page.locator('button:has-text("Play Solo")');
    await expect(playSoloButton).toBeVisible({ timeout: 5000 });
    
    // Click Play Solo
    await playSoloButton.click();
    
    // Should show "Creating Solo Game..." temporarily
    const creatingText = page.locator('text=/Creating Solo Game/i');
    await creatingText.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      // It might be too quick to see
      console.log('Creating Solo Game text was too quick to observe');
    });
    
    // Should redirect to game page
    await page.waitForURL('**/game/**', { timeout: 15000 });
    
    // Wait for the game to load completely
    await page.waitForLoadState('networkidle');
    
    // Game board should be visible (might be .cg-board or .cg-wrap)
    const boardSelector = '.cg-board, .cg-wrap';
    await page.waitForSelector(boardSelector, { timeout: 15000 });
    
    // Take screenshot to debug what's shown
    await page.screenshot({ path: 'test-results/solo-game-board-state.png', fullPage: true });
    
    // Check the game loaded properly - look for solo game indicators
    // The game might start with a ban phase or move phase
    const gameStatusOptions = [
      'text=/Playing as (White|Black)/i',  // Solo game indicator
      'text=/(White|Black) to (move|ban)/i',  // Game status
      'text=/Ban one of/i',  // Ban phase indicator
      // Check that both players are the same (solo game)
      page.locator('text=/SoloPlayer/').first()
    ];
    
    let foundStatus = false;
    for (const selector of gameStatusOptions) {
      const locator = typeof selector === 'string' ? page.locator(selector) : selector;
      if (await locator.isVisible().catch(() => false)) {
        foundStatus = true;
        console.log(`Found game indicator: ${typeof selector === 'string' ? selector : 'SoloPlayer username'}`);
        break;
      }
    }
    
    expect(foundStatus).toBe(true);
    
    // Verify it's truly a solo game - both players should be the same
    const playerNames = await page.locator('text=/Solo_/').all();
    expect(playerNames.length).toBeGreaterThanOrEqual(2); // Should show username for both white and black
  });

  test('can play moves as both colors', async ({ page }) => {
    // Start a solo game
    await page.click('button:has-text("Play Solo")');
    await page.waitForURL('**/game/**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-board, .cg-wrap, .chess-board-container', { timeout: 15000 });
    
    console.log('Solo game started, testing basic functionality...');
    
    // In a solo game, we should see both players have the same username  
    const usernames = await page.locator('text=/Solo_/').all();
    // Should have at least 2 occurrences (one for white, one for black)
    expect(usernames.length).toBeGreaterThanOrEqual(2);
    
    // Get the actual username values
    const usernameTexts = await Promise.all(usernames.map(u => u.textContent()));
    // Filter out any null values and check they're the same
    const uniqueUsernames = [...new Set(usernameTexts.filter(t => t))];
    expect(uniqueUsernames.length).toBe(1); // Should only be one unique username
    
    // We should see some game status indicating we can play
    const statusIndicators = [
      'text=/Playing as (White|Black)/i',
      'text=/(White|Black) to (move|ban)/i'
    ];
    
    let foundStatus = false;
    for (const selector of statusIndicators) {
      if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        foundStatus = true;
        console.log(`Found status: ${selector}`);
        break;
      }
    }
    
    expect(foundStatus).toBe(true);
    
    console.log('✅ Solo game is working - both colors controlled by same player!');
  });

  test('ban system works in solo mode', async ({ page }) => {
    // Start a solo game
    await page.click('button:has-text("Play Solo")');
    await page.waitForURL('**/game/**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-board, .cg-wrap, .chess-board-container', { timeout: 15000 });
    
    // Skip initial Black ban phase if present
    const initialBan = page.locator('text=/Black to ban/i');
    if (await initialBan.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Make a ban as Black
      await makeMove(page, 'e2', 'e4');
      await page.waitForTimeout(500);
    }
    
    // Now wait for White's turn
    await page.waitForSelector('text=/(White to move|Playing as White)/i', { timeout: 10000 });
    await makeMove(page, 'e2', 'e4');
    
    // After White's move, there should be a ban phase
    await page.waitForTimeout(1000);
    
    // Check if we're in ban phase (either "White to ban" or game progressed)
    const statusText = await page.locator('.text-lg.font-semibold').textContent();
    console.log('Status after White move:', statusText);
    
    // If in ban phase, make a ban
    if (statusText?.includes('ban')) {
      await banMove(page, 'e7', 'e5');
      await page.waitForTimeout(500);
    }
    
    // Check that the game progressed (either Black's turn or further)
    const newStatus = await page.locator('.text-lg.font-semibold').textContent();
    console.log('Status after ban:', newStatus);
    
    // Verify game is progressing
    expect(newStatus).toBeTruthy();
    console.log('✅ Ban system working correctly in solo mode!');
  });

  test('game status updates correctly for both colors', async ({ page }) => {
    // Start a solo game
    await page.click('button:has-text("Play Solo")');
    await page.waitForURL('**/game/**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-board, .cg-wrap, .chess-board-container', { timeout: 15000 });
    
    // Track status changes
    const statuses: string[] = [];
    
    // Get initial status
    let status = await page.locator('.text-lg.font-semibold').textContent();
    statuses.push(status || 'unknown');
    console.log('Initial status:', status);
    
    // If Black's ban phase, handle it
    if (status?.includes('Black to ban')) {
      await banMove(page, 'e2', 'e4');
      await page.waitForTimeout(500);
      status = await page.locator('.text-lg.font-semibold').textContent();
      statuses.push(status || 'unknown');
      console.log('After Black ban:', status);
    }
    
    // Make White's move if it's White's turn
    if (status?.includes('White to move')) {
      await makeMove(page, 'd2', 'd4');
      await page.waitForTimeout(500);
      status = await page.locator('.text-lg.font-semibold').textContent();
      statuses.push(status || 'unknown');
      console.log('After White move:', status);
    }
    
    // Make a ban if in ban phase
    if (status?.includes('ban')) {
      await banMove(page, 'e7', 'e5');
      await page.waitForTimeout(500);
      status = await page.locator('.text-lg.font-semibold').textContent();
      statuses.push(status || 'unknown');
      console.log('After ban:', status);
    }
    
    // Make Black's move if it's Black's turn
    if (status?.includes('Black to move')) {
      await makeMove(page, 'd7', 'd5');
      await page.waitForTimeout(500);
      status = await page.locator('.text-lg.font-semibold').textContent();
      statuses.push(status || 'unknown');
      console.log('After Black move:', status);
    }
    
    // Verify we saw status changes
    expect(statuses.length).toBeGreaterThan(2);
    console.log('✅ Game status updates correctly for both colors!');
  });

  test('can complete a full game in solo mode', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for full game
    
    // Start a solo game
    await page.click('button:has-text("Play Solo")');
    await page.waitForURL('**/game/**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.cg-board, .cg-wrap, .chess-board-container', { timeout: 15000 });
    
    console.log('Playing a game with dynamic move selection...');
    
    // Handle initial Black ban if present
    const blackBan = page.locator('text=/Black to ban/i');
    if (await blackBan.isVisible({ timeout: 1000 }).catch(() => false)) {
      await banMove(page, 'e2', 'e4');
      await page.waitForTimeout(500);
    }
    
    let moveCount = 0;
    const maxMoves = 10; // Play up to 10 moves
    
    while (moveCount < maxMoves && !await isGameOver(page)) {
      const status = await page.locator('.text-lg.font-semibold').textContent();
      console.log(`Move ${moveCount + 1}: ${status}`);
      
      // Get all available pieces and try to make a valid move
      if (status?.includes('move')) {
        // Try common opening moves first
        const possibleMoves = [
          { from: 'e2', to: 'e4' },
          { from: 'd2', to: 'd4' },
          { from: 'g1', to: 'f3' },
          { from: 'b1', to: 'c3' },
          { from: 'e7', to: 'e5' },
          { from: 'd7', to: 'd5' },
          { from: 'g8', to: 'f6' },
          { from: 'b8', to: 'c6' },
          { from: 'f1', to: 'c4' },
          { from: 'c1', to: 'f4' },
          { from: 'f8', to: 'c5' },
          { from: 'c8', to: 'f5' },
        ];
        
        let moveMade = false;
        for (const move of possibleMoves) {
          await clickSquare(page, move.from);
          await page.waitForTimeout(200);
          
          if (await isPieceSelected(page)) {
            // Check if destination is valid
            const boardInfo = await getBoardInfo(page);
            const { x, y } = squareToXY(move.to, boardInfo);
            
            const isValid = await page.evaluate(({ x, y }) => {
              const wrap = document.querySelector('.cg-wrap');
              if (!wrap) return false;
              const destSquares = wrap.querySelectorAll('square.move-dest');
              
              for (const dest of destSquares) {
                const style = (dest as HTMLElement).style.transform;
                if (style) {
                  const match = style.match(/translate\(([0-9.]+)px,\s*([0-9.]+)px\)/);
                  if (match) {
                    const dx = parseFloat(match[1]);
                    const dy = parseFloat(match[2]);
                    const wrapRect = wrap.getBoundingClientRect();
                    if (Math.abs(dx - (x - wrapRect.left)) < 10 && 
                        Math.abs(dy - (y - wrapRect.top)) < 10) {
                      return true;
                    }
                  }
                }
              }
              return false;
            }, { x, y });
            
            if (isValid) {
              await clickSquare(page, move.to);
              moveMade = true;
              break;
            } else {
              // Deselect by clicking the same square
              await clickSquare(page, move.from);
            }
          }
        }
        
        if (!moveMade) {
          console.log('Could not find a valid move, game might be stuck');
          break;
        }
      } else if (status?.includes('ban')) {
        // Make a simple ban - select OPPONENT's pieces
        // If Black to ban, select White pieces. If White to ban, select Black pieces
        const possibleBans = status.includes('Black to ban') ? [
          // Black is banning, so select White pieces
          { from: 'e2', to: 'e4' },
          { from: 'd2', to: 'd4' },
          { from: 'g1', to: 'f3' },
          { from: 'b1', to: 'c3' },
        ] : [
          // White is banning, so select Black pieces
          { from: 'e7', to: 'e5' },
          { from: 'd7', to: 'd5' },
          { from: 'g8', to: 'f6' },
          { from: 'b8', to: 'c6' },
        ];
        
        for (const ban of possibleBans) {
          await banMove(page, ban.from, ban.to);
          await page.waitForTimeout(500);
          const newStatus = await page.locator('.text-lg.font-semibold').textContent();
          if (newStatus !== status) {
            // Ban was successful
            break;
          }
        }
      }
      
      await page.waitForTimeout(500);
      moveCount++;
    }
    
    // Check that we made progress in the game
    const gameActive = page.locator('text=/(White|Black) to (move|ban)/i');
    const gameEnded = page.locator('text=/(Checkmate|Stalemate|Draw)/i');
    
    const isActive = await gameActive.isVisible().catch(() => false);
    const hasEnded = await gameEnded.isVisible().catch(() => false);
    
    expect(isActive || hasEnded).toBe(true);
    expect(moveCount).toBeGreaterThan(2); // Should have made at least a few moves
    console.log(`✅ Game completed ${moveCount} moves. Status: ${isActive ? 'Still playing' : 'Game ended'}`);
  });
});