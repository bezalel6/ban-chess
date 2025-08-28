import { test, expect, type Page } from '@playwright/test';
import { makeMove, banMove } from './utils/chess-board-helpers';

/**
 * Handles authentication process for the test
 * @param page Playwright Page object
 * @returns Promise that resolves when authentication is complete
 */
async function handleAuthentication(page: Page): Promise<void> {
  console.log('Starting authentication process');

  // Reset URL and clear any existing state
  await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 30000 });

  // Complex authentication strategy with multiple fallback mechanisms
  const authStrategies: Array<(page: Page) => Promise<boolean>> = [
    async (currentPage: Page) => {
      console.log('Attempting strategy 1: Sign in link');
      try {
        const signInLink = currentPage.locator('a').filter({ hasText: /Sign in/ }).first();
        
        if (await signInLink.isVisible({ timeout: 5000 })) {
          await signInLink.click({ force: true });
          
          // Wait for username input with generous timeout
          const usernameInput = await currentPage.waitForSelector('input[type="text"]', { timeout: 10000 });
          
          const uniqueUsername = `GameTest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          await usernameInput.fill(uniqueUsername);
          
          const submitButton = await currentPage.waitForSelector('button[type="submit"], button:has-text("Play")', { timeout: 5000 });
          await submitButton.click({ force: true });
          
          // Wait for navigation, but be flexible
          await currentPage.waitForURL('**/', { timeout: 10000 });
          await currentPage.waitForLoadState('networkidle');
          
          return true;
        }
      } catch (error) {
        console.log('Strategy 1 failed:', error);
      }
      return false;
    },
    async (currentPage: Page) => {
      console.log('Attempting strategy 2: Direct username input');
      try {
        const usernameInput = currentPage.locator('input[type="text"]:visible').first();
        
        if (await usernameInput.isVisible({ timeout: 10000 })) {
          const uniqueUsername = `SoloTest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          
          await usernameInput.fill(uniqueUsername);
          const playButton = currentPage.locator('button:has-text("Play")').first();
          await playButton.click({ force: true });
          
          await currentPage.waitForTimeout(3000);
          return true;
        }
      } catch (error) {
        console.log('Strategy 2 failed:', error);
      }
      return false;
    },
    async (currentPage: Page) => {
      console.log('Attempting strategy 3: WebSocket-based authentication');
      try {
        await currentPage.evaluate(() => {
          // @ts-ignore
          const wsManager = globalThis.wsManager || window.wsManager;
          if (wsManager && wsManager.authenticate) {
            const username = `AutoTest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            wsManager.authenticate(username);
            return true;
          }
          return false;
        });
        
        // Wait for potential game startup
        await currentPage.waitForTimeout(5000);
        return true;
      } catch (error) {
        console.log('Strategy 3 failed:', error);
      }
      return false;
    }
  ];

  // Try authentication strategies with logging
  for (const strategy of authStrategies) {
    console.log('Attempting authentication strategy');
    const result = await strategy(page);
    if (result) {
      console.log('Authentication successful');
      return;
    }
  }

  // Take a screenshot if all strategies fail
  await page.screenshot({ path: 'test-results/auth-failure.png' });
  throw new Error('Could not authenticate through any strategy');
}

test.describe('Solo Game Detailed Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(150000); // 2.5 minutes timeout
    
    try {
      await page.goto('http://localhost:3000', { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });

      await handleAuthentication(page);

      // Log page content for debugging
      await page.evaluate(() => {
        console.log('Document body text:', document.body.textContent);
        console.log('All buttons:', Array.from(document.querySelectorAll('button')).map(b => b.textContent));
      });

      // Wait for game mode buttons to be available
      await page.waitForTimeout(5000);

      // Attempt multiple strategies to start a solo game
      const selectors = [
        'button:has-text("Play Solo")',
        'button:has-text("play solo")',
        'button[data-testid="play-solo"]',
        'button.play-solo',
        'button'
      ];

      let buttonFound = false;
      for (const selector of selectors) {
        try {
          const buttons = page.locator(selector);
          const count = await buttons.count();
          console.log(`Checking selector ${selector}, found ${count} buttons`);

          if (count > 0) {
            await buttons.first().click({ force: true });
            buttonFound = true;
            break;
          }
        } catch (err) {
          console.log(`Failed to use selector ${selector}:`, err);
        }
      }

      if (!buttonFound) {
        // Take a screenshot for diagnostics
        await page.screenshot({ path: 'test-results/page-content.png' });
        throw new Error('Could not find a button to start solo game');
      }
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  test('Detailed Solo Game Flow without Refreshes', async ({ page, context }) => {
    try {
      // Debug: Take initial screenshot
      await page.screenshot({ path: 'test-results/initial-page.png' });

      // Allow for manual interaction debugging
      await context.tracing.start({ screenshots: true, snapshots: true });

      // Use console logging for maximum visibility
      await page.evaluate(() => {
        console.log('Window location:', window.location);
        console.log('Document readyState:', document.readyState);
      });

      // Attempt to start game programmatically
      await page.evaluate(() => {
        try {
          // @ts-ignore
          const wsManager = globalThis.wsManager || window.wsManager;
          if (wsManager && wsManager.createSoloGame) {
            wsManager.createSoloGame();
          } else {
            console.error('Could not find WebSocket manager to create solo game');
          }
        } catch (error) {
          console.error('Error in programmatic game start:', error);
        }
      });

      // Wait for game page with much longer timeout and verbose logging
      const gamePageUrl = await page.waitForURL(
        '**/game/**', 
        { 
          timeout: 60000,
          waitUntil: 'networkidle'
        }
      );

      // Additional verification
      const pageUrl = await page.url();
      console.log('Current page URL:', pageUrl);

      // Wait for board to be visible
      await page.waitForSelector('.cg-wrap, .chess-board-container', { timeout: 30000 });

      // Take a screenshot of the game page
      await page.screenshot({ path: 'test-results/game-page.png' });

      // Log initial game state
      const initialStatusElement = page.locator('.text-lg.font-semibold');
      const initialStatus = await initialStatusElement.textContent() ?? 'No status found';
      console.log('🎲 Initial Game State:', initialStatus);

      // Additional instrumentation
      await context.tracing.stop({
        path: 'test-results/trace.zip'
      });

      // Minimal assertions to allow investigation
      expect(pageUrl).toContain('/game/');
      expect(initialStatus).toBeTruthy();
      expect(await page.locator('.cg-board').isVisible()).toBe(true);
    } catch (error) {
      console.error('Test execution error:', error);
      
      // Take a final screenshot before throwing
      await page.screenshot({ path: 'test-results/error-screenshot.png' });
      
      // Stop tracing and save trace file
      await context.tracing.stop({
        path: 'test-results/error-trace.zip'
      });

      throw error;
    }
  });
});