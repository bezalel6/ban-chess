import { test, expect } from '@playwright/test';
import { generateTestUsername } from './utils/test-helpers';

test.describe('Game Queue - Simple', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login with a test user
    const username = generateTestUsername('game');
    const usernameInput = page.locator('input[name="username"]');
    await usernameInput.fill(username);
    
    const playButton = page.getByRole('button', { name: /let's play/i });
    await playButton.click();
    
    // Wait for login to complete
    await page.locator('.fixed.inset-0.bg-black\\/90').waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(2000); // Give WebSocket time to connect
  });

  test('should show join queue button after login', async ({ page }) => {
    // Look for join queue button
    const joinQueueButton = page.getByRole('button', { name: /join queue/i });
    
    // It might be disabled initially while connecting
    await expect(joinQueueButton).toBeVisible({ timeout: 10000 });
    
    // Wait for it to become enabled (when WebSocket is connected)
    await expect(joinQueueButton).toBeEnabled({ timeout: 10000 });
  });

  test('should be able to join queue', async ({ page }) => {
    // Wait for join queue button to be enabled
    const joinQueueButton = page.getByRole('button', { name: /join queue/i });
    await expect(joinQueueButton).toBeEnabled({ timeout: 10000 });
    
    // Click to join queue
    await joinQueueButton.click();
    
    // Should show leave queue button
    const leaveQueueButton = page.getByRole('button', { name: /leave queue/i });
    await expect(leaveQueueButton).toBeVisible({ timeout: 5000 });
    
    // Should show queue position
    const queuePosition = page.locator('text=/position in queue/i');
    await expect(queuePosition).toBeVisible();
  });

  test.skip('should be able to leave queue', async ({ page }) => {
    // Join queue first
    const joinQueueButton = page.getByRole('button', { name: /join queue/i });
    await expect(joinQueueButton).toBeEnabled({ timeout: 10000 });
    await joinQueueButton.click();
    
    // Wait for leave button to appear
    const leaveQueueButton = page.getByRole('button', { name: /leave queue/i });
    await expect(leaveQueueButton).toBeVisible({ timeout: 5000 });
    
    // Verify we're in queue
    const queuePosition = page.locator('text=/position in queue/i');
    await expect(queuePosition).toBeVisible();
    
    // Click to leave queue
    await leaveQueueButton.click();
    
    // Wait for UI to update
    await page.waitForTimeout(2000);
    
    // Check that "Finding Opponent" text is gone
    const findingText = page.locator('text=/finding opponent/i');
    await expect(findingText).toBeHidden({ timeout: 5000 });
    
    // Check that "Ready to Play?" text is back
    const readyText = page.locator('text=/ready to play/i');
    await expect(readyText).toBeVisible({ timeout: 5000 });
  });

  test('should show queue status messages', async ({ page }) => {
    // Check for "Ready to Play?" heading
    const readyText = page.locator('text=/ready to play/i');
    await expect(readyText).toBeVisible();
    
    // Join queue
    const joinQueueButton = page.getByRole('button', { name: /join queue/i });
    await expect(joinQueueButton).toBeEnabled({ timeout: 10000 });
    await joinQueueButton.click();
    
    // Should show "Finding Opponent..." text
    const findingText = page.locator('text=/finding opponent/i');
    await expect(findingText).toBeVisible({ timeout: 5000 });
  });

  test('should handle WebSocket connection states', async ({ page }) => {
    // Check initial button states - be more specific with selector
    const joinQueueButton = page.getByRole('button', { name: /join queue|connecting|login required/i });
    
    // Should eventually show "Join Queue" when connected
    await expect(joinQueueButton).toContainText('Join Queue', { timeout: 10000 });
  });
});