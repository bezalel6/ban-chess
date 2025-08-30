import { test, expect } from './fixtures/test';
import {
  generateTestUsername,
  clearStorageAndCookies,
  waitForToast,
} from './utils/test-helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorageAndCookies(page);
    await page.goto('/');
  });

  test('should allow user to set a username', async ({ page, authPage }) => {
    const username = generateTestUsername('player');

    // Set username
    await authPage.setUsername(username);

    // Wait for username to be set
    await authPage.waitForLogin();

    // Verify username is displayed
    const displayedUsername = await authPage.getUsername();
    expect(displayedUsername).toContain(username);

    // Verify username is stored in localStorage
    const storedUsername = await page.evaluate(() =>
      localStorage.getItem('username')
    );
    expect(storedUsername).toBe(username);
  });

  test('should show error for invalid username', async ({ page, authPage }) => {
    // Try to set an empty username
    await authPage.setUsername('');

    // Check for error message
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('Username is required');
  });

  test('should show error for duplicate username', async ({
    page,
    authPage,
  }) => {
    const username = 'existingUser';

    // First user sets username
    await authPage.setUsername(username);
    await authPage.waitForLogin();

    // Open new page for second user
    const newPage = await page.context().newPage();
    await newPage.goto('/');
    const secondAuthPage = new (await import('./fixtures/auth-page')).AuthPage(
      newPage
    );

    // Try to set same username
    await secondAuthPage.setUsername(username);

    // Check for error
    const errorMessage = await secondAuthPage.getErrorMessage();
    expect(errorMessage).toContain('Username already taken');

    await newPage.close();
  });

  test('should persist username across page reloads', async ({
    page,
    authPage,
  }) => {
    const username = generateTestUsername('persistent');

    // Set username
    await authPage.setUsername(username);
    await authPage.waitForLogin();

    // Reload page
    await page.reload();

    // Check username is still there
    await authPage.waitForLogin();
    const displayedUsername = await authPage.getUsername();
    expect(displayedUsername).toContain(username);
  });

  test('should allow user to logout', async ({ page, authPage }) => {
    const username = generateTestUsername('logout');

    // Set username
    await authPage.setUsername(username);
    await authPage.waitForLogin();

    // Logout
    await authPage.logout();

    // Check that login form is shown again
    const loginFormVisible = await authPage.loginForm.isVisible();
    expect(loginFormVisible).toBe(true);

    // Check localStorage is cleared
    const storedUsername = await page.evaluate(() =>
      localStorage.getItem('username')
    );
    expect(storedUsername).toBeNull();
  });

  test('should display user stats', async ({ authPage }) => {
    const username = generateTestUsername('stats');

    // Set username
    await authPage.setUsername(username);
    await authPage.waitForLogin();

    // Check initial stats
    const stats = await authPage.getUserStats();
    expect(stats).toEqual({
      wins: 0,
      losses: 0,
      draws: 0,
      rating: 1000,
    });
  });

  test('should handle special characters in username', async ({ authPage }) => {
    const specialUsernames = ['user_123', 'user-name', 'UserName', '123user'];

    for (const username of specialUsernames) {
      await authPage.setUsername(username);
      await authPage.waitForLogin();

      const displayedUsername = await authPage.getUsername();
      expect(displayedUsername).toContain(username);

      // Clear for next iteration
      await authPage.logout();
    }
  });

  test('should validate username length', async ({ authPage }) => {
    // Test too short username
    await authPage.setUsername('ab');
    let errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('at least 3 characters');

    // Test too long username
    const longUsername = 'a'.repeat(21);
    await authPage.setUsername(longUsername);
    errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('maximum 20 characters');

    // Test valid length
    const validUsername = generateTestUsername('valid');
    await authPage.setUsername(validUsername);
    await authPage.waitForLogin();

    const displayedUsername = await authPage.getUsername();
    expect(displayedUsername).toContain(validUsername);
  });

  test('should show connection status', async ({ page, authPage }) => {
    const username = generateTestUsername('connection');

    // Set username
    await authPage.setUsername(username);
    await authPage.waitForLogin();

    // Check for connection status indicator
    const wsStatus = page.locator('[data-testid="ws-status"]');
    await expect(wsStatus).toBeVisible();
    await expect(wsStatus).toContainText(/connected/i);
  });

  test('should handle reconnection', async ({ page, authPage, context }) => {
    const username = generateTestUsername('reconnect');

    // Set username
    await authPage.setUsername(username);
    await authPage.waitForLogin();

    // Simulate disconnection
    await context.setOffline(true);

    // Check for disconnected status
    const wsStatus = page.locator('[data-testid="ws-status"]');
    await expect(wsStatus).toContainText(/disconnected|offline/i);

    // Simulate reconnection
    await context.setOffline(false);

    // Wait for reconnection
    await page.waitForTimeout(2000);

    // Check for connected status
    await expect(wsStatus).toContainText(/connected|online/i);
  });
});
