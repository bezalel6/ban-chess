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
    this.board = page.locator('[data-testid="chess-board"]');
    this.moveInput = page.locator('input[placeholder*="move"]');
    this.submitMoveButton = page.getByRole('button', { name: /submit move/i });
    this.banWordInput = page.locator('input[placeholder*="ban"]');
    this.submitBanButton = page.getByRole('button', { name: /ban word/i });
    this.timer = page.locator('[data-testid="game-timer"]');
    this.playerTurn = page.locator('[data-testid="player-turn"]');
    this.moveHistory = page.locator('[data-testid="move-history"]');
    this.bannedWords = page.locator('[data-testid="banned-words"]');
    this.gameStatus = page.locator('[data-testid="game-status"]');
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
      (expectedPlayer) => {
        const turnElement = document.querySelector('[data-testid="player-turn"]');
        return turnElement?.textContent?.toLowerCase().includes(expectedPlayer);
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