import { Page } from '@playwright/test';

/**
 * Wait for WebSocket connection to be established
 * Look for actual UI indicators instead of non-existent test IDs
 */
export async function waitForWebSocketConnection(page: Page, timeout = 15000) {
  await page.waitForFunction(
    () => {
      // Check if the Join Queue button is enabled (indicates WebSocket connection)
      const joinButton = document.querySelector(
        'button:has-text("Join Queue")'
      );
      if (joinButton && !joinButton.disabled) return true;

      // Alternative: check if we can see "Ready to Play?" which means connection is established
      const readyText = document.querySelector('h2');
      if (readyText?.textContent?.includes('Ready to Play')) return true;

      // Also check for "Finding Opponent" state if already in queue
      const findingText = document.querySelector('h2');
      if (findingText?.textContent?.includes('Finding Opponent')) return true;

      return false;
    },
    { timeout }
  );
}

/**
 * Create a test user with a unique username
 */
export function generateTestUsername(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Wait for a specific toast notification
 */
export async function waitForToast(
  page: Page,
  message: string,
  timeout = 5000
) {
  const toast = page.locator('[data-testid="toast"]', { hasText: message });
  await toast.waitFor({ state: 'visible', timeout });
  return toast;
}

/**
 * Clear local storage and cookies
 */
export async function clearStorageAndCookies(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

/**
 * Mock a successful game match
 */
export async function mockGameMatch(page: Page, opponentName = 'opponent') {
  await page.evaluate(opponent => {
    // Simulate receiving a match from WebSocket
    window.dispatchEvent(
      new CustomEvent('ws-message', {
        detail: {
          type: 'matched',
          data: {
            opponent,
            color: 'white',
            gameId: 'test-game-123',
          },
        },
      })
    );
  }, opponentName);
}

/**
 * Check if element has specific CSS class
 */
export async function hasClass(
  page: Page,
  selector: string,
  className: string
): Promise<boolean> {
  return await page.locator(selector).evaluate((el, cls) => {
    return el.classList.contains(cls);
  }, className);
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(page: Page, selector: string) {
  await page.locator(selector).evaluate(element => {
    return new Promise<void>(resolve => {
      const animation = element.getAnimations()[0];
      if (animation) {
        animation.finished.then(() => resolve());
      } else {
        resolve();
      }
    });
  });
}

/**
 * Take a screenshot with consistent naming
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: false,
  });
}

/**
 * Simulate network conditions
 */
export async function simulateSlowNetwork(page: Page) {
  await page.route('**/*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Add 1s delay
    await route.continue();
  });
}

/**
 * Check accessibility of current page
 */
export async function checkAccessibility(page: Page) {
  const violations = await page.evaluate(async () => {
    // This would normally use axe-core, but we'll do a basic check
    const issues: string[] = [];

    // Check for missing alt text
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      issues.push(`${images.length} images missing alt text`);
    }

    // Check for missing button labels
    const buttons = document.querySelectorAll('button:not([aria-label]):empty');
    if (buttons.length > 0) {
      issues.push(`${buttons.length} buttons missing labels`);
    }

    // Check for missing form labels
    const inputs = document.querySelectorAll('input:not([aria-label])');
    const labelsFor = Array.from(document.querySelectorAll('label[for]')).map(
      l => l.getAttribute('for')
    );
    const unlabeledInputs = Array.from(inputs).filter(input => {
      const id = input.id;
      return id && !labelsFor.includes(id);
    });
    if (unlabeledInputs.length > 0) {
      issues.push(`${unlabeledInputs.length} inputs missing labels`);
    }

    return issues;
  });

  return violations;
}

/**
 * Wait for a specific game state
 */
export async function waitForGameState(
  page: Page,
  state: string,
  timeout = 30000
) {
  await page.waitForFunction(
    expectedState => {
      const stateElement = document.querySelector('[data-testid="game-state"]');
      return stateElement?.textContent
        ?.toLowerCase()
        .includes(expectedState.toLowerCase());
    },
    state,
    { timeout }
  );
}
