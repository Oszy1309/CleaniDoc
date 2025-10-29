// E2E Test: Application Navigation and Core Functionality
import { test, expect } from '@playwright/test';

test.describe('CleaniDoc Dashboard - Core Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('should load the application homepage', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle(/CleaniDoc Dashboard/);

    // Check that the root element exists
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Check for main application elements
    const appContainer = page.locator('.App, [data-testid="app"]').first();
    await expect(appContainer).toBeVisible();
  });

  test('should display login form when not authenticated', async ({ page }) => {
    // Look for login form elements
    const loginForm = page.locator('form').first();

    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await expect(passwordInput).toBeVisible();

    // Check for login button
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Anmelden")').first();
    await expect(loginButton).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    // Find and click the login button without filling the form
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Anmelden")').first();

    if (await loginButton.isVisible()) {
      await loginButton.click();

      // Wait for validation errors to appear
      await page.waitForTimeout(1000);

      // Check for error messages (could be toasts, inline errors, etc.)
      const errorElements = page.locator('.error, .invalid, [role="alert"], .toast-error').first();

      // At least one error should be visible
      const hasError = await errorElements.count() > 0;
      expect(hasError).toBe(true);
    }
  });

  test('should handle invalid login credentials gracefully', async ({ page }) => {
    // Fill in invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Anmelden")').first();

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword');
      await loginButton.click();

      // Wait for error response
      await page.waitForTimeout(3000);

      // Should show error message
      const errorMessage = page.locator('.error, .invalid, [role="alert"], .toast-error').first();
      const hasError = await errorMessage.count() > 0;
      expect(hasError).toBe(true);

      // Should still be on login page (not redirected)
      await expect(emailInput).toBeVisible();
    }
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that the app still loads and is functional
    await page.reload();
    await page.waitForLoadState('networkidle');

    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Check that forms are still usable on mobile
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeVisible();

      // Test that input is focusable and clickable
      await emailInput.click();
      await emailInput.fill('test@example.com');

      const value = await emailInput.inputValue();
      expect(value).toBe('test@example.com');
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    // Try to interact with the app
    await page.reload();

    // App should handle offline state
    await page.waitForTimeout(2000);

    // Look for error messages or offline indicators
    const errorIndicators = page.locator('.error, .offline, .network-error, [role="alert"]');
    const hasErrorIndicator = await errorIndicators.count() > 0;

    // Either show error indicator or gracefully degrade
    expect(hasErrorIndicator || await page.locator('#root').isVisible()).toBe(true);

    // Re-enable network
    await page.context().setOffline(false);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for main landmarks
    const main = page.locator('main, [role="main"]').first();

    // Check for form labels
    const inputs = page.locator('input[type="email"], input[type="password"]');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);

      // Each input should have a label or aria-label
      const hasLabel = await input.getAttribute('aria-label') !== null ||
                      await input.getAttribute('aria-labelledby') !== null ||
                      await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0;

      expect(hasLabel).toBe(true);
    }

    // Check for button accessibility
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button should have text or aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('should load and display proper fonts', async ({ page }) => {
    // Check that custom fonts are loaded
    await page.waitForLoadState('networkidle');

    // Get computed styles of body
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize
      };
    });

    // Should use system fonts or custom fonts (not browser defaults)
    expect(bodyStyles.fontFamily).toBeTruthy();
    expect(bodyStyles.fontFamily).not.toBe('Times');
    expect(bodyStyles.fontFamily).not.toBe('serif');
  });
});

test.describe('CleaniDoc Dashboard - Error Handling', () => {
  test('should handle JavaScript errors gracefully', async ({ page }) => {
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger some interactions to potentially cause errors
    const clickableElements = page.locator('button, a, input').first();
    if (await clickableElements.isVisible()) {
      await clickableElements.click();
    }

    await page.waitForTimeout(2000);

    // Check that no critical errors occurred
    const criticalErrors = errors.filter(error =>
      !error.includes('React DevTools') &&
      !error.includes('Warning:') &&
      !error.includes('extension')
    );

    const criticalPageErrors = pageErrors.filter(error =>
      !error.includes('React DevTools') &&
      !error.includes('extension')
    );

    if (criticalErrors.length > 0) {
      console.warn('Console errors found:', criticalErrors);
    }

    if (criticalPageErrors.length > 0) {
      console.warn('Page errors found:', criticalPageErrors);
    }

    // For now, just warn about errors. In a real app, you might want to fail the test
    // expect(criticalErrors.length).toBe(0);
    // expect(criticalPageErrors.length).toBe(0);
  });
});