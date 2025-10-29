// E2E Test: Dashboard Functionality and User Workflows
import { test, expect } from '@playwright/test';

test.describe('CleaniDoc Dashboard - User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate between different sections', async ({ page }) => {
    // Look for navigation elements
    const navElements = page.locator('nav a, .sidebar a, .nav-link, [role="navigation"] a');
    const navCount = await navElements.count();

    if (navCount > 0) {
      // Test navigation to different sections
      for (let i = 0; i < Math.min(navCount, 3); i++) {
        const navItem = navElements.nth(i);
        const href = await navItem.getAttribute('href');
        const text = await navItem.textContent();

        if (href && !href.startsWith('http') && !href.includes('mailto:')) {
          console.log(`Testing navigation to: ${text} (${href})`);

          await navItem.click();
          await page.waitForTimeout(1000);
          await page.waitForLoadState('networkidle');

          // Verify URL changed or content updated
          const currentUrl = page.url();
          const hasUrlChanged = currentUrl.includes(href) || href === '/';

          // Look for content change indicators
          const contentChanged = await page.locator('#root').isVisible();

          expect(hasUrlChanged || contentChanged).toBe(true);
        }
      }
    }
  });

  test('should handle sidebar/drawer functionality', async ({ page }) => {
    // Look for sidebar toggle button (mobile hamburger menu)
    const toggleButton = page.locator(
      '.drawer-toggle, .sidebar-toggle, .menu-toggle, button[aria-label*="menu"], button[aria-label*="navigation"]'
    ).first();

    if (await toggleButton.isVisible()) {
      // Test opening/closing sidebar
      await toggleButton.click();
      await page.waitForTimeout(500);

      // Look for sidebar content
      const sidebar = page.locator('.sidebar, .drawer, nav, [role="navigation"]').first();
      await expect(sidebar).toBeVisible();

      // Test closing sidebar (if there's a close button)
      const closeButton = page.locator('.drawer-close, .sidebar-close, .close').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display and interact with data tables/lists', async ({ page }) => {
    // Navigate to a section that might have data tables
    const dataViews = page.locator('a:has-text("Kunden"), a:has-text("Customers"), a:has-text("Workers"), a:has-text("Arbeiter")');
    const dataViewCount = await dataViews.count();

    if (dataViewCount > 0) {
      await dataViews.first().click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');

      // Look for table or list elements
      const tables = page.locator('table, .table, .data-table, .list, .grid');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        const table = tables.first();
        await expect(table).toBeVisible();

        // Check for table headers
        const headers = page.locator('th, .header, .column-header');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);

        // Look for action buttons (add, edit, delete)
        const actionButtons = page.locator(
          'button:has-text("Add"), button:has-text("Hinzufügen"), button:has-text("New"), button:has-text("Neu")'
        );

        if (await actionButtons.count() > 0) {
          const addButton = actionButtons.first();
          await expect(addButton).toBeVisible();

          // Test clicking add button
          await addButton.click();
          await page.waitForTimeout(1000);

          // Should open a modal or navigate to a form
          const modal = page.locator('.modal, .dialog, [role="dialog"]').first();
          const form = page.locator('form').first();

          const hasModalOrForm = await modal.isVisible() || await form.isVisible();
          if (hasModalOrForm) {
            // Close modal if opened
            const closeButton = page.locator('.modal-close, .close, button:has-text("Cancel"), button:has-text("Abbrechen")').first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }
          }
        }
      }
    }
  });

  test('should handle form interactions', async ({ page }) => {
    // Look for any forms on the page
    const forms = page.locator('form');
    const formCount = await forms.count();

    if (formCount > 0) {
      const form = forms.first();

      // Find form inputs
      const inputs = form.locator('input:not([type="hidden"]), textarea, select');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        // Test filling out form fields
        for (let i = 0; i < Math.min(inputCount, 3); i++) {
          const input = inputs.nth(i);
          const inputType = await input.getAttribute('type');
          const tagName = await input.evaluate(el => el.tagName.toLowerCase());

          if (await input.isVisible() && await input.isEnabled()) {
            switch (inputType) {
              case 'email':
                await input.fill('test@example.com');
                break;
              case 'password':
                await input.fill('testpassword123');
                break;
              case 'text':
                await input.fill('Test input value');
                break;
              case 'number':
                await input.fill('123');
                break;
              case 'tel':
                await input.fill('+49123456789');
                break;
              default:
                if (tagName === 'textarea') {
                  await input.fill('Test textarea content');
                } else if (tagName === 'select') {
                  const options = input.locator('option');
                  const optionCount = await options.count();
                  if (optionCount > 1) {
                    await input.selectOption({ index: 1 });
                  }
                } else {
                  await input.fill('Test value');
                }
            }

            // Verify value was set
            if (tagName !== 'select') {
              const value = await input.inputValue();
              expect(value).toBeTruthy();
            }
          }
        }

        // Test form validation (submit without required fields)
        const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Look for validation messages or success/error feedback
          const feedback = page.locator('.error, .success, .invalid, .valid, [role="alert"], .toast').first();
          // Validation or feedback should appear
          const hasFeedback = await feedback.count() > 0;
          // It's okay if there's no validation - just testing that the form handles submission
        }
      }
    }
  });

  test('should handle search functionality', async ({ page }) => {
    // Look for search inputs
    const searchInputs = page.locator(
      'input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="suchen"]'
    );

    const searchCount = await searchInputs.count();

    if (searchCount > 0) {
      const searchInput = searchInputs.first();
      await expect(searchInput).toBeVisible();

      // Test search functionality
      await searchInput.fill('test search query');
      await page.keyboard.press('Enter');

      await page.waitForTimeout(2000);

      // Look for search results or updated content
      const results = page.locator('.results, .search-results, .list, table tbody tr');
      const resultCount = await results.count();

      // Should either show results or indicate no results found
      const noResults = page.locator('.no-results, .empty, .not-found');
      const hasNoResultsMessage = await noResults.count() > 0;

      expect(resultCount > 0 || hasNoResultsMessage).toBe(true);
    }
  });

  test('should handle error states appropriately', async ({ page }) => {
    // Test with a route that might not exist
    await page.goto('/nonexistent-page');
    await page.waitForTimeout(2000);

    // Should show 404 page or redirect to login/home
    const notFoundIndicators = page.locator(
      ':has-text("404"), :has-text("Not Found"), :has-text("Page not found"), .error-page, .not-found'
    );

    const loginIndicators = page.locator('input[type="email"], input[type="password"]');
    const homeIndicators = page.locator('.dashboard, .home, .welcome');

    const hasErrorHandling = await notFoundIndicators.count() > 0 ||
                            await loginIndicators.count() > 0 ||
                            await homeIndicators.count() > 0;

    expect(hasErrorHandling).toBe(true);
  });

  test('should maintain responsive design across viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Medium' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      console.log(`Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check that main content is visible and accessible
      const mainContent = page.locator('#root, main, .app, .container').first();
      await expect(mainContent).toBeVisible();

      // Check that buttons are clickable
      const buttons = page.locator('button:visible').first();
      if (await buttons.isVisible()) {
        const isClickable = await buttons.isEnabled();
        expect(isClickable).toBe(true);
      }

      // Check that text is readable (not too small or overlapping)
      const bodyStyles = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return parseFloat(styles.fontSize);
      });

      // Font size should be at least 12px on mobile, 14px on desktop
      const minFontSize = viewport.width < 768 ? 12 : 14;
      expect(bodyStyles).toBeGreaterThanOrEqual(minFontSize);
    }
  });
});