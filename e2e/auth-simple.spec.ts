import { test, expect } from '@playwright/test';
import { generateTestUsername } from './utils/test-helpers';

test.describe('Authentication - Simple', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show username overlay on first visit', async ({ page }) => {
    // Check that the overlay is visible (more specific selector to avoid React Scan toolbar)
    const overlay = page.locator('.fixed.inset-0.bg-black\\/90');
    await expect(overlay).toBeVisible();
    
    // Check for welcome text
    await expect(page.locator('text=Welcome to Ban Chess!')).toBeVisible();
    
    // Check for username input
    const usernameInput = page.locator('input[name="username"]');
    await expect(usernameInput).toBeVisible();
    
    // Check for play button
    const playButton = page.getByRole('button', { name: /let's play/i });
    await expect(playButton).toBeVisible();
  });

  test('should allow user to set username and start playing', async ({ page }) => {
    const username = generateTestUsername('player');
    
    // Fill in username
    const usernameInput = page.locator('input[name="username"]');
    await usernameInput.fill(username);
    
    // Click play button
    const playButton = page.getByRole('button', { name: /let's play/i });
    await playButton.click();
    
    // Wait for overlay to disappear
    const overlay = page.locator('.fixed.inset-0.bg-black\\/90');
    await expect(overlay).toBeHidden({ timeout: 10000 });
    
    // Check that username is displayed
    await page.waitForTimeout(1000);
    const userDisplay = page.locator('text=Playing as');
    await expect(userDisplay).toBeVisible();
  });

  test('should validate username length', async ({ page }) => {
    const usernameInput = page.locator('input[name="username"]');
    const playButton = page.getByRole('button', { name: /let's play/i });
    
    // Test too short username (less than 2 characters)
    await usernameInput.fill('a');
    await expect(playButton).toBeDisabled();
    
    // Test valid username
    await usernameInput.fill('ab');
    await expect(playButton).toBeEnabled();
    
    // Test maximum length (20 characters)
    await usernameInput.fill('a'.repeat(20));
    await expect(playButton).toBeEnabled();
    
    // Input should enforce maxLength
    await usernameInput.fill('a'.repeat(25));
    const value = await usernameInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(20);
  });

  test('should show error for invalid characters', async ({ page }) => {
    const usernameInput = page.locator('input[name="username"]');
    
    // The input has a pattern attribute that should validate
    await usernameInput.fill('user@123'); // @ is not allowed
    
    // Try to submit
    const playButton = page.getByRole('button', { name: /let's play/i });
    await playButton.click();
    
    // Check if form validation prevents submission
    // The browser should show validation error
    const isValid = await usernameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should persist username after page reload', async ({ page }) => {
    const username = generateTestUsername('persist');
    
    // Set username
    const usernameInput = page.locator('input[name="username"]');
    await usernameInput.fill(username);
    
    const playButton = page.getByRole('button', { name: /let's play/i });
    await playButton.click();
    
    // Wait for login to complete
    await page.locator('.fixed.inset-0.bg-black\\/90').waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    
    // Check that overlay is not shown (user is still logged in)
    const overlay = page.locator('.fixed.inset-0.bg-black\\/90');
    await expect(overlay).toBeHidden();
    
    // Check username is still displayed
    const userDisplay = page.locator('text=Playing as');
    await expect(userDisplay).toBeVisible();
  });

  test('should allow user to sign out', async ({ page }) => {
    const username = generateTestUsername('signout');
    
    // Login first
    const usernameInput = page.locator('input[name="username"]');
    await usernameInput.fill(username);
    
    const playButton = page.getByRole('button', { name: /let's play/i });
    await playButton.click();
    
    // Wait for login
    await page.locator('.fixed.inset-0.bg-black\\/90').waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Find and click sign out button
    const signOutButton = page.getByRole('button', { name: /sign out/i });
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();
    
    // Wait a bit for logout to process
    await page.waitForTimeout(2000);
    
    // Should see login overlay again
    const overlay = page.locator('.fixed.inset-0.bg-black\\/90');
    await expect(overlay).toBeVisible({ timeout: 10000 });
  });
});