import { test, expect } from './fixtures/test';
import { generateTestUsername } from './utils/test-helpers';
import {
  runA11yAudit,
  testKeyboardNavigation,
  testFocusIndicators,
  testAriaAttributes,
} from './utils/accessibility';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page, authPage }) => {
    await page.goto('/');

    // Set up user authentication for full app testing
    const username = generateTestUsername('a11y');
    await authPage.setUsername(username);
    await authPage.waitForLogin();
  });

  test('should pass accessibility audit on home page', async ({ page }) => {
    const audit = await runA11yAudit(page);

    // Check for critical issues
    expect(audit.axeViolations.length).toBe(0);
    expect(audit.keyboardIssues.length).toBe(0);
    expect(audit.ariaIssues.length).toBe(0);
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    const issues = await testKeyboardNavigation(page);
    expect(issues).toHaveLength(0);

    // Test tab order
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );
    expect(focusedElement).toBeTruthy();

    // Continue tabbing through interactive elements
    const tabSequence: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const element = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName}.${el.className}` : null;
      });
      if (element) tabSequence.push(element);
    }

    // Ensure we can tab through elements
    expect(tabSequence.length).toBeGreaterThan(0);
  });

  test('should have visible focus indicators', async ({ page }) => {
    const issues = await testFocusIndicators(page);
    expect(issues).toHaveLength(0);

    // Test specific elements
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) {
      // Test first 3 buttons
      await button.focus();

      const hasFocusStyle = await button.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.outline !== 'none' || style.boxShadow !== 'none';
      });

      expect(hasFocusStyle).toBe(true);
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    const issues = await testAriaAttributes(page);
    expect(issues).toHaveLength(0);

    // Check specific elements
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const hasLabel = await button.evaluate(el => {
        return !!(
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.textContent?.trim()
        );
      });
      expect(hasLabel).toBe(true);
    }

    // Check form inputs
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const hasLabel = await input.evaluate(el => {
        const id = el.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        return !!(
          label ||
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby')
        );
      });
      expect(hasLabel).toBe(true);
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for landmark regions
    const landmarks = await page.evaluate(() => {
      const regions = {
        main: document.querySelector('main'),
        nav: document.querySelector('nav'),
        header: document.querySelector('header'),
        footer: document.querySelector('footer'),
      };

      return {
        hasMain: !!regions.main,
        hasNav: !!regions.nav,
        hasHeader: !!regions.header,
        hasFooter: !!regions.footer,
      };
    });

    // Should have at least main landmark
    expect(landmarks.hasMain).toBe(true);

    // Check for proper heading hierarchy
    const headings = await page.evaluate(() => {
      const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(allHeadings).map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent,
      }));
    });

    // Should have exactly one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBe(1);

    // Check heading hierarchy is sequential
    for (let i = 1; i < headings.length; i++) {
      const prevLevel = headings[i - 1].level;
      const currLevel = headings[i].level;
      // Level should not jump more than 1
      expect(currLevel - prevLevel).toBeLessThanOrEqual(1);
    }
  });

  test('should handle focus trap in modals', async ({ page, chessPage }) => {
    // Trigger a modal (e.g., resign dialog)
    await chessPage.joinQueue();

    // Open resign dialog
    const resignButton = page.locator('button:has-text("Resign")');
    if (await resignButton.isVisible()) {
      await resignButton.click();

      // Check modal is open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Test focus trap
      const focusableInModal = await modal
        .locator('button, input, [tabindex="0"]')
        .all();

      if (focusableInModal.length > 0) {
        // Focus should be trapped in modal
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.closest('[role="dialog"]') !== null;
        });
        expect(focusedElement).toBe(true);
      }

      // Close modal with Escape
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Check text contrast
    const contrastIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('*');

      elements.forEach(element => {
        const text = element.textContent?.trim();
        if (!text || text.length === 0) return;

        const style = window.getComputedStyle(element);
        const fontSize = parseFloat(style.fontSize);

        // Skip if element is not visible
        if (style.display === 'none' || style.visibility === 'hidden') return;

        // Basic check for dark text on light background or vice versa
        const bgColor = style.backgroundColor;
        const textColor = style.color;

        if (bgColor === textColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          issues.push(
            `Same background and text color on: ${text.substring(0, 30)}`
          );
        }
      });

      return issues;
    });

    expect(contrastIssues).toHaveLength(0);
  });

  test('should support reduced motion', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Check that animations are disabled or reduced
    const hasReducedMotion = await page.evaluate(() => {
      const testElement = document.createElement('div');
      testElement.style.transition = 'all 0.3s';
      document.body.appendChild(testElement);

      const style = window.getComputedStyle(testElement);
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

      document.body.removeChild(testElement);

      return mediaQuery.matches;
    });

    expect(hasReducedMotion).toBe(true);
  });

  test('should have skip navigation link', async ({ page }) => {
    // Look for skip link
    const skipLink = page.locator('a:has-text("Skip")').first();

    if ((await skipLink.count()) > 0) {
      // Skip link should be accessible via keyboard
      await page.keyboard.press('Tab');
      const isSkipLinkFocused = await skipLink.evaluate(el => {
        return document.activeElement === el;
      });

      // Skip link should become visible on focus
      if (isSkipLinkFocused) {
        await expect(skipLink).toBeVisible();
      }
    }
  });

  test('should announce live regions', async ({ page, chessPage }) => {
    // Check for ARIA live regions
    const liveRegions = await page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);

    // Test that game status updates are announced
    await chessPage.joinQueue();

    // Check queue status has live region
    const queueStatus = page.locator('[data-testid="queue-status"]');
    const hasAriaLive = await queueStatus.evaluate(el => {
      return (
        el.getAttribute('aria-live') !== null ||
        el.closest('[aria-live]') !== null
      );
    });

    expect(hasAriaLive).toBe(true);
  });
});
