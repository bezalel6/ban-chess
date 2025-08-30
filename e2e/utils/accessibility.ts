import { Page } from '@playwright/test';
import { injectAxe, checkA11y, configureAxe } from '@axe-core/playwright';

export interface A11yOptions {
  context?: string;
  rules?: Record<string, { enabled: boolean }>;
  skipFailures?: boolean;
}

/**
 * Run accessibility tests on a page
 */
export async function testAccessibility(page: Page, options: A11yOptions = {}) {
  const { context = 'main', rules = {}, skipFailures = false } = options;

  // Inject axe-core
  await injectAxe(page);

  // Configure axe with custom rules if provided
  if (Object.keys(rules).length > 0) {
    await configureAxe(page, {
      rules,
    });
  }

  // Run accessibility checks
  await checkA11y(
    page,
    context,
    {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    },
    skipFailures
  );
}

/**
 * Test keyboard navigation
 */
export async function testKeyboardNavigation(page: Page) {
  const issues: string[] = [];

  // Check if all interactive elements are keyboard accessible
  const interactiveElements = await page.evaluate(() => {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const elements = document.querySelectorAll(selectors.join(', '));
    const inaccessible: string[] = [];

    elements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      if (
        computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden'
      ) {
        return;
      }

      // Check if element has tabindex
      const tabindex = el.getAttribute('tabindex');
      if (tabindex === '-1') {
        inaccessible.push(
          `${el.tagName.toLowerCase()}${el.className ? '.' + el.className : ''}`
        );
      }
    });

    return inaccessible;
  });

  if (interactiveElements.length > 0) {
    issues.push(
      `Keyboard inaccessible elements: ${interactiveElements.join(', ')}`
    );
  }

  return issues;
}

/**
 * Test color contrast
 */
export async function testColorContrast(page: Page) {
  return await page.evaluate(() => {
    const issues: string[] = [];

    // Get all text elements
    const textElements = document.querySelectorAll('*');

    textElements.forEach(element => {
      const text = element.textContent?.trim();
      if (!text || text.length === 0) return;

      const style = window.getComputedStyle(element);
      const backgroundColor = style.backgroundColor;
      const color = style.color;

      // Skip if transparent
      if (
        backgroundColor === 'rgba(0, 0, 0, 0)' ||
        backgroundColor === 'transparent'
      ) {
        return;
      }

      // Simple contrast check (would need proper WCAG calculation in production)
      const rgb = (str: string) => {
        const match = str.match(/\d+/g);
        return match ? match.map(Number) : [0, 0, 0];
      };

      const [r1, g1, b1] = rgb(backgroundColor);
      const [r2, g2, b2] = rgb(color);

      // Calculate relative luminance
      const luminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const l1 = luminance(r1, g1, b1);
      const l2 = luminance(r2, g2, b2);

      const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

      // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
      const fontSize = parseFloat(style.fontSize);
      const requiredContrast = fontSize >= 18 ? 3 : 4.5;

      if (contrast < requiredContrast) {
        issues.push(
          `Low contrast (${contrast.toFixed(2)}:1) on element with text "${text.substring(0, 20)}..."`
        );
      }
    });

    return issues;
  });
}

/**
 * Test focus indicators
 */
export async function testFocusIndicators(page: Page) {
  const issues: string[] = [];

  // Tab through all focusable elements and check for visible focus indicators
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  for (const selector of focusableSelectors) {
    const elements = await page.locator(selector).all();

    for (const element of elements) {
      await element.focus();

      const hasFocusIndicator = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        const focusStyle = window.getComputedStyle(el, ':focus');

        // Check if there's a visible focus indicator
        return (
          style.outline !== 'none' ||
          style.border !== focusStyle.border ||
          style.boxShadow !== focusStyle.boxShadow ||
          style.backgroundColor !== focusStyle.backgroundColor
        );
      });

      if (!hasFocusIndicator) {
        const text = await element.textContent();
        issues.push(
          `Missing focus indicator on ${selector}: "${text?.substring(0, 20)}..."`
        );
      }
    }
  }

  return issues;
}

/**
 * Test ARIA attributes
 */
export async function testAriaAttributes(page: Page) {
  return await page.evaluate(() => {
    const issues: string[] = [];

    // Check for invalid ARIA attributes
    const elementsWithAria = document.querySelectorAll(
      '[aria-labelledby], [aria-describedby]'
    );

    elementsWithAria.forEach(element => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const describedBy = element.getAttribute('aria-describedby');

      if (labelledBy) {
        const ids = labelledBy.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id)) {
            issues.push(`Invalid aria-labelledby reference: ${id}`);
          }
        });
      }

      if (describedBy) {
        const ids = describedBy.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id)) {
            issues.push(`Invalid aria-describedby reference: ${id}`);
          }
        });
      }
    });

    // Check for missing required ARIA attributes
    const rolesRequiringLabel = [
      'button',
      'link',
      'checkbox',
      'radio',
      'textbox',
    ];

    rolesRequiringLabel.forEach(role => {
      const elements = document.querySelectorAll(`[role="${role}"]`);
      elements.forEach(element => {
        const hasLabel =
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') ||
          element.textContent?.trim();

        if (!hasLabel) {
          issues.push(`Element with role="${role}" missing accessible label`);
        }
      });
    });

    return issues;
  });
}

/**
 * Run comprehensive accessibility audit
 */
export async function runA11yAudit(page: Page) {
  const results = {
    axeViolations: [],
    keyboardIssues: [] as string[],
    contrastIssues: [] as string[],
    focusIssues: [] as string[],
    ariaIssues: [] as string[],
  };

  try {
    // Run axe-core tests
    await testAccessibility(page, { skipFailures: true });
  } catch (e: unknown) {
    const error = e as { violations?: unknown[] };
    results.axeViolations = (error.violations as never[]) || [];
  }

  // Run custom tests
  results.keyboardIssues = await testKeyboardNavigation(page);
  results.contrastIssues = await testColorContrast(page);
  results.focusIssues = await testFocusIndicators(page);
  results.ariaIssues = await testAriaAttributes(page);

  return results;
}
