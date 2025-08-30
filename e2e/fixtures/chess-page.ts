import { Page, Locator } from '@playwright/test';

export class ChessPage {
  readonly page: Page;
  readonly board: Locator;
  readonly moveInput: Locator;
  readonly submitMoveButton: Locator;
  readonly banWordInput: Locator;
  readonly submitBanButton: Locator;
  readonly timer: Locator;
  readonly playerTurn: Locator;
  readonly moveHistory: Locator;
  readonly bannedWords: Locator;
  readonly gameStatus: Locator;
  readonly queueButton: Locator;
  readonly leaveQueueButton: Locator;
  readonly resignButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use more generic selectors that match the actual ChessBoard component
    this.board = page
      .locator('.chessboard-container, .chess-board, [class*="chessboard"]')
      .first();
    this.moveInput = page.locator('input[type="text"]').first();
    this.submitMoveButton = page.getByRole('button', {
      name: /submit|make move|move/i,
    });
    this.banWordInput = page.locator(
      'input[placeholder*="ban"], input[placeholder*="word"]'
    );
    this.submitBanButton = page.getByRole('button', { name: /ban/i });
    // Use more generic selectors instead of specific test IDs
    this.timer = page.locator('[class*="timer"], .timer, .game-timer').first();
    this.playerTurn = page
      .locator('[class*="turn"], .player-turn, .current-player')
      .first();
    this.moveHistory = page
      .locator('[class*="history"], .move-history, .moves')
      .first();
    this.bannedWords = page.locator('[class*="banned"], .banned-words').first();
    this.gameStatus = page
      .locator('[class*="status"], .game-status, .status')
      .first();
    this.queueButton = page.getByRole('button', { name: /join queue/i });
    this.leaveQueueButton = page.getByRole('button', { name: /leave queue/i });
    this.resignButton = page.getByRole('button', { name: /resign/i });
  }

  async goto() {
    await this.page.goto('/');
  }

  async makeMove(move: string) {
    await this.moveInput.fill(move);
    await this.submitMoveButton.click();
  }

  async banWord(word: string) {
    await this.banWordInput.fill(word);
    await this.submitBanButton.click();
  }

  async joinQueue() {
    await this.queueButton.click();
  }

  async leaveQueue() {
    await this.leaveQueueButton.click();
  }

  async resign() {
    await this.resignButton.click();
  }

  async waitForGameStart() {
    await this.board.waitFor({ state: 'visible' });
    await this.playerTurn.waitFor({ state: 'visible' });
  }

  async waitForTurn(player: 'white' | 'black') {
    await this.page.waitForFunction(
      expectedPlayer => {
        // Look for turn indicators in various possible locations
        const possibleSelectors = [
          '[class*="turn"]',
          '.player-turn',
          '.current-player',
          '[class*="status"]',
          '.game-status',
        ];

        for (const selector of possibleSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.toLowerCase().includes(expectedPlayer)) {
            return true;
          }
        }

        // Also check if it's white's turn by looking for move input availability
        if (expectedPlayer === 'white') {
          const moveInput = document.querySelector('input[type="text"]');
          return moveInput && !moveInput.disabled;
        }

        return false;
      },
      player,
      { timeout: 30000 }
    );
  }

  async getGameStatus() {
    return await this.gameStatus.textContent();
  }

  async getBannedWords() {
    const words = await this.bannedWords.locator('li').allTextContents();
    return words;
  }

  async getMoveHistory() {
    const moves = await this.moveHistory.locator('li').allTextContents();
    return moves;
  }
}
