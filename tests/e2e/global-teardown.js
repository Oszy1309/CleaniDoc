// Global teardown for Playwright tests
async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // Optional: Cleanup test data
    // await cleanupTestData();

    console.log('✅ E2E test cleanup complete');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error here to avoid masking test failures
  }
}

// Optional: Cleanup test data
async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');

  // Example: Remove test users, test data, etc.
  // This would typically interact with your API or database

  console.log('✅ Test data cleanup complete');
}

export default globalTeardown;