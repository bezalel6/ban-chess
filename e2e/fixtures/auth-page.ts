import { Page, Locator } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly setUsernameButton: Locator;
  readonly currentUsername: Locator;
  readonly userStats: Locator;
  readonly loginForm: Locator;
  readonly logoutButton: Locator;
  readonly errorMessage: Locator;
  readonly usernameOverlay: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.setUsernameButton = page.getByRole('button', { name: /let's play/i });
    this.currentUsername = page.locator('span:has-text("Playing as") + span');
    this.userStats = page.locator('[data-testid="user-stats"]');
    this.loginForm = page.locator('form').first();
    this.logoutButton = page.getByRole('button', { name: /sign out/i });
    this.signOutButton = page.getByRole('button', { name: /sign out/i });
    this.errorMessage = page.locator('.text-red-400');
    this.usernameOverlay = page.locator('.fixed.inset-0.bg-black\\/90');
  }

  async setUsername(username: string) {
    await this.usernameInput.fill(username);
    await this.setUsernameButton.click();
  }

  async logout() {
    await this.signOutButton.click();
  }

  async waitForLogin() {
    // Wait for the overlay to disappear and the username to be shown
    await this.usernameOverlay.waitFor({ state: 'hidden', timeout: 10000 });
    await this.page.waitForTimeout(500); // Small delay for state to settle
  }

  async getUsername() {
    // Get the username from the "Playing as" display
    const usernameElement = await this.page
      .locator('span:has-text("Playing as")')
      .locator('..')
      .locator('span.text-white');
    return await usernameElement.textContent();
  }

  async getUserStats() {
    const statsText = await this.userStats.textContent();
    // Parse stats from the text content
    const stats = {
      wins: 0,
      losses: 0,
      draws: 0,
      rating: 1000,
    };

    if (statsText) {
      const winsMatch = statsText.match(/wins:\s*(\d+)/i);
      const lossesMatch = statsText.match(/losses:\s*(\d+)/i);
      const drawsMatch = statsText.match(/draws:\s*(\d+)/i);
      const ratingMatch = statsText.match(/rating:\s*(\d+)/i);

      if (winsMatch) stats.wins = parseInt(winsMatch[1]);
      if (lossesMatch) stats.losses = parseInt(lossesMatch[1]);
      if (drawsMatch) stats.draws = parseInt(drawsMatch[1]);
      if (ratingMatch) stats.rating = parseInt(ratingMatch[1]);
    }

    return stats;
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }

  async isLoggedIn() {
    return await this.currentUsername.isVisible();
  }
}
