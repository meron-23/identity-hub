#!/usr/bin/env node

/**
 * E2E Test Runner for Identity Hub
 * Runs the complete end-to-end test suite
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Identity Hub E2E Test Runner');
console.log('=====================================\n');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
process.env.AI_BASE_URL = process.env.AI_BASE_URL || 'http://localhost:5001';

console.log('📋 Test Configuration:');
console.log(`   Backend URL: ${process.env.TEST_BASE_URL}`);
console.log(`   AI Service URL: ${process.env.AI_BASE_URL}`);
console.log(`   Environment: ${process.env.NODE_ENV}\n`);

// Check if Jest is available
try {
  require('jest');
} catch (error) {
  console.error('❌ Jest is not installed. Please run: npm install --save-dev jest');
  process.exit(1);
}

// Run the E2E tests
const jestProcess = spawn('npx', ['jest', 'tests/e2e.test.js', '--verbose', '--detectOpenHandles'], {
  stdio: 'inherit',
  cwd: path.join(__dirname),
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

jestProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n🎉 All E2E tests passed successfully!');
    console.log('✅ Identity Hub integration is working correctly!');
  } else {
    console.log(`\n❌ E2E tests failed with exit code ${code}`);
    console.log('🔧 Please check the test output above for details.');
    process.exit(code);
  }
});

jestProcess.on('error', (error) => {
  console.error('❌ Failed to run E2E tests:', error.message);
  process.exit(1);
});
