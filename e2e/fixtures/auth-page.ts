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

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[placeholder*="username"]');
    this.setUsernameButton = page.getByRole('button', { name: /set username/i });
    this.currentUsername = page.locator('[data-testid="current-username"]');
    this.userStats = page.locator('[data-testid="user-stats"]');
    this.loginForm = page.locator('[data-testid="login-form"]');
    this.logoutButton = page.getByRole('button', { name: /logout/i });
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async setUsername(username: string) {
    await this.usernameInput.fill(username);
    await this.setUsernameButton.click();
  }

  async logout() {
    await this.logoutButton.click();
  }

  async waitForLogin() {
    await this.currentUsername.waitFor({ state: 'visible' });
  }

  async getUsername() {
    return await this.currentUsername.textContent();
  }

  async getUserStats() {
    const statsText = await this.userStats.textContent();
    // Parse stats from the text content
    const stats = {
      wins: 0,
      losses: 0,
      draws: 0,
      rating: 1000
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