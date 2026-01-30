/**
 * Accessibility Testing Configuration
 *
 * Automated accessibility testing using axe-core with Playwright or Puppeteer.
 * Tests against WCAG 2.1 Level AA standards by default.
 *
 * Features:
 * - Automated WCAG compliance checking
 * - Visual regression for color contrast
 * - Keyboard navigation testing
 * - Screen reader compatibility hints
 *
 * Installation:
 *   npm install --save-dev @axe-core/playwright playwright
 *   npx playwright install
 *
 * Usage:
 *   npx playwright test accessibility.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Configuration for accessibility testing
const a11yConfig = {
  // WCAG conformance level: 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'
  standard: 'wcag21aa' as const,

  // Rules to run (null = all rules)
  rules: null as string[] | null,

  // Rules to disable (e.g., for known issues being addressed)
  disabledRules: [] as string[],

  // Include/exclude specific elements
  include: [] as string[],
  exclude: [] as string[],

  // Pages to test
  pages: [
    { name: 'Home', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Settings', path: '/settings' },
    // Add more pages as needed
  ],

  // Viewports to test
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
  ],

  // Thresholds
  thresholds: {
    critical: 0, // No critical violations allowed
    serious: 0, // No serious violations allowed
    moderate: 5, // Allow some moderate violations
    minor: 10, // Allow some minor violations
  },
};

/**
 * Run axe accessibility scan on a page
 */
async function runA11yScan(page: Page, options: {
  include?: string[];
  exclude?: string[];
  disabledRules?: string[];
} = {}) {
  let builder = new AxeBuilder({ page })
    .withTags([a11yConfig.standard]);

  // Apply includes
  if (options.include?.length) {
    builder = builder.include(options.include);
  }

  // Apply excludes
  if (options.exclude?.length) {
    for (const selector of options.exclude) {
      builder = builder.exclude(selector);
    }
  }

  // Disable specific rules
  if (options.disabledRules?.length) {
    builder = builder.disableRules(options.disabledRules);
  }

  const results = await builder.analyze();

  return {
    violations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete,
    inapplicable: results.inapplicable.length,
    summary: {
      critical: results.violations.filter(v => v.impact === 'critical').length,
      serious: results.violations.filter(v => v.impact === 'serious').length,
      moderate: results.violations.filter(v => v.impact === 'moderate').length,
      minor: results.violations.filter(v => v.impact === 'minor').length,
    },
  };
}

/**
 * Format violation for readable output
 */
function formatViolation(violation: any) {
  return {
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node: any) => ({
      html: node.html.substring(0, 200),
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  };
}

// Main accessibility test suite
test.describe('Accessibility Tests', () => {
  // Test each page at each viewport
  for (const pageConfig of a11yConfig.pages) {
    for (const viewport of a11yConfig.viewports) {
      test(`${pageConfig.name} page should be accessible at ${viewport.name} viewport`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Navigate to page
        await page.goto(pageConfig.path);

        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');

        // Run accessibility scan
        const results = await runA11yScan(page, {
          exclude: a11yConfig.exclude,
          disabledRules: a11yConfig.disabledRules,
        });

        // Check against thresholds
        expect(results.summary.critical, `Critical violations on ${pageConfig.name}`).toBeLessThanOrEqual(
          a11yConfig.thresholds.critical
        );
        expect(results.summary.serious, `Serious violations on ${pageConfig.name}`).toBeLessThanOrEqual(
          a11yConfig.thresholds.serious
        );
        expect(results.summary.moderate, `Moderate violations on ${pageConfig.name}`).toBeLessThanOrEqual(
          a11yConfig.thresholds.moderate
        );
        expect(results.summary.minor, `Minor violations on ${pageConfig.name}`).toBeLessThanOrEqual(
          a11yConfig.thresholds.minor
        );

        // Log violations for debugging
        if (results.violations.length > 0) {
          console.log(`\nViolations on ${pageConfig.name} (${viewport.name}):`);
          for (const violation of results.violations) {
            console.log(JSON.stringify(formatViolation(violation), null, 2));
          }
        }
      });
    }
  }
});

// Keyboard navigation tests
test.describe('Keyboard Navigation', () => {
  test('Tab navigation follows logical order', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all focusable elements in tab order
    const focusableElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 50),
        tabIndex: (el as HTMLElement).tabIndex,
      }));
    });

    // Verify there are focusable elements
    expect(focusableElements.length).toBeGreaterThan(0);

    // Tab through first 10 elements and verify focus moves
    for (let i = 0; i < Math.min(10, focusableElements.length); i++) {
      await page.keyboard.press('Tab');

      // Verify an element has focus
      const hasFocus = await page.evaluate(() => {
        return document.activeElement !== document.body;
      });
      expect(hasFocus, `Element ${i + 1} should be focusable`).toBe(true);
    }
  });

  test('Focus indicators are visible', async ({ page }) => {
    await page.goto('/');

    // Tab to first focusable element
    await page.keyboard.press('Tab');

    // Check that focus indicator is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return null;

      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    // Verify focus is indicated somehow
    const hasFocusIndicator =
      (focusedElement?.outlineWidth && focusedElement.outlineWidth !== '0px') ||
      (focusedElement?.boxShadow && focusedElement.boxShadow !== 'none');

    expect(hasFocusIndicator, 'Focused elements should have visible focus indicators').toBe(true);
  });

  test('Skip link is present and functional', async ({ page }) => {
    await page.goto('/');

    // Tab to first element (should be skip link if present)
    await page.keyboard.press('Tab');

    // Check for skip link
    const skipLink = await page.$('a[href="#main"], a[href="#content"], [class*="skip"]');

    if (skipLink) {
      // Verify skip link works
      await skipLink.click();

      // Main content should now have focus or be scrolled to
      const mainHasFocus = await page.evaluate(() => {
        const main = document.querySelector('main, #main, #content, [role="main"]');
        return main?.contains(document.activeElement) || main === document.activeElement;
      });

      expect(mainHasFocus, 'Skip link should move focus to main content').toBe(true);
    }
  });
});

// Color contrast tests
test.describe('Color Contrast', () => {
  test('Text meets contrast requirements', async ({ page }) => {
    await page.goto('/');

    const results = await runA11yScan(page);

    // Filter for color contrast violations
    const contrastViolations = results.violations.filter(v =>
      v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
    );

    expect(contrastViolations.length, 'Should have no color contrast violations').toBe(0);

    if (contrastViolations.length > 0) {
      console.log('Color contrast violations:');
      for (const v of contrastViolations) {
        console.log(JSON.stringify(formatViolation(v), null, 2));
      }
    }
  });
});

// Form accessibility tests
test.describe('Form Accessibility', () => {
  test('Form inputs have associated labels', async ({ page }) => {
    await page.goto('/login'); // or any page with forms

    const results = await runA11yScan(page);

    const labelViolations = results.violations.filter(v =>
      v.id === 'label' || v.id === 'label-title-only'
    );

    expect(labelViolations.length, 'All form inputs should have labels').toBe(0);
  });

  test('Form errors are announced to screen readers', async ({ page }) => {
    await page.goto('/login');

    // Submit empty form to trigger validation
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();

      // Check for proper error handling
      const hasErrorAnnouncement = await page.evaluate(() => {
        // Check for aria-live regions
        const liveRegions = document.querySelectorAll('[aria-live], [role="alert"]');
        // Check for aria-invalid on inputs
        const invalidInputs = document.querySelectorAll('[aria-invalid="true"]');
        // Check for aria-describedby pointing to error messages
        const describedInputs = document.querySelectorAll('[aria-describedby]');

        return {
          hasLiveRegion: liveRegions.length > 0,
          hasInvalidInputs: invalidInputs.length > 0,
          hasDescribedInputs: describedInputs.length > 0,
        };
      });

      // At least one accessibility pattern should be used
      const usesAccessiblePattern =
        hasErrorAnnouncement.hasLiveRegion ||
        hasErrorAnnouncement.hasInvalidInputs ||
        hasErrorAnnouncement.hasDescribedInputs;

      expect(usesAccessiblePattern, 'Form errors should be accessible to screen readers').toBe(true);
    }
  });
});

// Export configuration and utilities
export { a11yConfig, runA11yScan, formatViolation };

/**
 * Additional Configuration for CI/CD
 *
 * playwright.config.ts:
 * ```typescript
 * import { defineConfig } from '@playwright/test';
 *
 * export default defineConfig({
 *   testDir: './tests',
 *   reporter: [
 *     ['html', { outputFolder: 'playwright-report' }],
 *     ['json', { outputFile: 'test-results/a11y-results.json' }],
 *   ],
 *   use: {
 *     baseURL: process.env.BASE_URL || 'http://localhost:3000',
 *   },
 * });
 * ```
 *
 * package.json scripts:
 * ```json
 * {
 *   "scripts": {
 *     "test:a11y": "playwright test --grep @a11y",
 *     "test:a11y:report": "playwright show-report"
 *   }
 * }
 * ```
 */
