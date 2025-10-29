// Global setup for Playwright tests
import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Setting up E2E test environment...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');

    // Wait for the app to load
    await page.waitForSelector('#root', { timeout: 30000 });

    // Check if app is responsive
    await page.waitForLoadState('networkidle');

    console.log('✅ Application is ready for testing');

    // Optional: Setup test data, authentication, etc.
    // await setupTestData(page);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Optional: Setup test data
async function setupTestData(page) {
  console.log('📦 Setting up test data...');

  // Example: Create test user, test data, etc.
  // This would typically interact with your API or database

  console.log('✅ Test data setup complete');
}

export default globalSetup;