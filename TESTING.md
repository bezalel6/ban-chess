# Testing Guide for 2Ban-2Chess

This comprehensive guide covers the end-to-end (E2E) testing setup using Playwright for the 2Ban-2Chess Next.js 15 application.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [CI/CD Integration](#cicd-integration)
- [Debugging Tests](#debugging-tests)
- [Best Practices](#best-practices)

## Overview

Our testing setup includes:

- **Playwright** for E2E testing
- **@axe-core/playwright** for accessibility testing
- **GitHub Actions** for CI/CD
- Support for multiple browsers (Chromium, Firefox, WebKit)
- Mobile device testing
- Visual regression testing capabilities
- Comprehensive accessibility audits

## Setup

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Or install specific browsers
npx playwright install chromium firefox webkit
```

### Project Structure

```
e2e/
├── fixtures/
│   ├── test.ts          # Custom test fixtures
│   ├── auth-page.ts     # Authentication page object
│   └── chess-page.ts    # Chess game page object
├── utils/
│   ├── test-helpers.ts  # Common test utilities
│   └── accessibility.ts # A11y testing utilities
├── auth.spec.ts         # Authentication tests
├── game.spec.ts         # Game mechanics tests
└── accessibility.spec.ts # Accessibility tests
```

## Running Tests

### Basic Commands

```bash
# Run all tests (headless)
npm run test

# Run tests with UI mode
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Debug tests
npm run test:debug

# Run specific test files
npm run test:auth    # Authentication tests
npm run test:game    # Game tests
npm run test:a11y    # Accessibility tests

# Run tests in specific browsers
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Run mobile tests
npm run test:mobile

# Show HTML report
npm run test:report

# Generate test code
npm run test:codegen
```

### Test Output

Tests run headless by default and output to:

- **Terminal**: Real-time test results
- **JSON**: `test-results.json` for programmatic access
- **JUnit XML**: `test-results.xml` for CI integration
- **HTML Report**: Run `npm run test:report` to view

## Writing Tests

### Page Object Pattern

We use the Page Object Model pattern for maintainable tests:

```typescript
// e2e/fixtures/chess-page.ts
import { Page, Locator } from '@playwright/test';

export class ChessPage {
  readonly page: Page;
  readonly board: Locator;

  constructor(page: Page) {
    this.page = page;
    this.board = page.locator('[data-testid="chess-board"]');
  }

  async makeMove(move: string) {
    await this.moveInput.fill(move);
    await this.submitMoveButton.click();
  }
}
```

### Custom Fixtures

Use custom fixtures for reusable test setup:

```typescript
// e2e/fixtures/test.ts
export const test = base.extend<Fixtures>({
  chessPage: async ({ page }, use) => {
    const chessPage = new ChessPage(page);
    await use(chessPage);
  },
});
```

### Example Test

```typescript
import { test, expect } from './fixtures/test';

test.describe('Chess Game', () => {
  test('should make a valid move', async ({ chessPage }) => {
    await chessPage.goto();
    await chessPage.joinQueue();
    await chessPage.waitForGameStart();

    await chessPage.makeMove('e2e4');

    const history = await chessPage.getMoveHistory();
    expect(history).toContain('e2e4');
  });
});
```

### Test Helpers

Common utilities are available in `e2e/utils/test-helpers.ts`:

```typescript
import {
  generateTestUsername,
  waitForWebSocketConnection,
} from './utils/test-helpers';

test('example', async ({ page }) => {
  const username = generateTestUsername('player');
  await waitForWebSocketConnection(page);
});
```

## Test Structure

### Test Categories

1. **Authentication Tests** (`auth.spec.ts`)
   - Username validation
   - Session persistence
   - Logout functionality
   - Connection status

2. **Game Tests** (`game.spec.ts`)
   - Queue management
   - Move validation
   - Word banning mechanics
   - Game state transitions
   - Timer functionality

3. **Accessibility Tests** (`accessibility.spec.ts`)
   - WCAG compliance
   - Keyboard navigation
   - Screen reader support
   - Color contrast
   - Focus management

### Data Test IDs

Use `data-testid` attributes for reliable element selection:

```tsx
<div data-testid="chess-board">...</div>
<button data-testid="submit-move">Submit</button>
```

Access in tests:

```typescript
const board = page.locator('[data-testid="chess-board"]');
```

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/e2e-tests.yml` workflow:

1. **Matrix Testing**: Runs tests across browsers
2. **Parallel Execution**: Tests run concurrently
3. **Artifact Upload**: Saves test results and screenshots
4. **Accessibility Audits**: Dedicated a11y test job
5. **Mobile Testing**: Tests responsive design

### Environment Variables

```yaml
env:
  CI: true
  PLAYWRIGHT_BASE_URL: http://localhost:3000
```

### Test Reports

CI generates:

- Test results (JSON, XML)
- Screenshots on failure
- Videos on failure
- Accessibility reports
- Coverage summaries

## Debugging Tests

### Interactive Debugging

```bash
# Debug mode with breakpoints
npm run test:debug

# Step through tests
await page.pause();
```

### Visual Debugging

```bash
# Run with headed browser
npm run test:headed

# Slow down execution
npx playwright test --slow-mo=100
```

### Screenshots & Videos

```typescript
// Take screenshot during test
await page.screenshot({ path: 'debug.png' });

// Configure in playwright.config.ts
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
}
```

### Trace Viewer

```bash
# Record trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
test.beforeEach(async ({ page }) => {
  await clearStorageAndCookies(page);
  await page.goto('/');
});
```

### 2. Explicit Waits

Use explicit waits over arbitrary timeouts:

```typescript
// Good
await page.waitForSelector('[data-testid="game-board"]');
await expect(element).toBeVisible();

// Avoid
await page.waitForTimeout(5000);
```

### 3. Accessibility First

Always include accessibility checks:

```typescript
test('should be accessible', async ({ page }) => {
  await injectAxe(page);
  await checkA11y(page);
});
```

### 4. Data Attributes

Use semantic test IDs:

```tsx
data-testid="game-board"       // Specific
data-testid="div-1"            // Avoid
```

### 5. Error Handling

Handle errors gracefully:

```typescript
test('should handle errors', async ({ page }) => {
  await expect(async () => {
    await page.click('non-existent');
  }).rejects.toThrow();
});
```

### 6. Performance

Monitor test performance:

```typescript
test('should load quickly', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - start;
  expect(loadTime).toBeLessThan(3000);
});
```

### 7. Mobile Testing

Test responsive design:

```typescript
test.describe('Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should work on mobile', async ({ page }) => {
    await page.goto('/');
    // Mobile-specific assertions
  });
});
```

### 8. Network Conditions

Test under various conditions:

```typescript
test('slow network', async ({ page }) => {
  await page.route('**/*', route => {
    setTimeout(() => route.continue(), 1000);
  });
  // Test with network delay
});
```

## Troubleshooting

### Common Issues

1. **Tests timeout**
   - Increase timeout in config
   - Check for missing waits
   - Verify selectors exist

2. **Flaky tests**
   - Add explicit waits
   - Check race conditions
   - Ensure proper cleanup

3. **CI failures**
   - Check environment variables
   - Verify browser installation
   - Review artifacts for details

### Debug Commands

```bash
# Verbose output
DEBUG=pw:api npx playwright test

# Single test
npx playwright test -g "test name"

# Specific browser
npx playwright test --browser=firefox

# Update snapshots
npx playwright test --update-snapshots
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Accessibility Testing](https://www.w3.org/WAI/test-evaluate/)
- [GitHub Actions](https://docs.github.com/en/actions)

## Support

For issues or questions:

1. Check existing tests for patterns
2. Review Playwright docs
3. Check CI logs for errors
4. Create an issue with reproduction steps
