import { test as base, expect } from '@playwright/test';
import { ChessPage } from './chess-page';
import { AuthPage } from './auth-page';

type Fixtures = {
  chessPage: ChessPage;
  authPage: AuthPage;
};

export const test = base.extend<Fixtures>({
  chessPage: async ({ page }, use) => {
    const chessPage = new ChessPage(page);
    await use(chessPage);
  },
  
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },
});

export { expect } from '@playwright/test';