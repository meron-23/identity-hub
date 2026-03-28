module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  collectCoverage: false,
  testTimeout: 30000, // 30 seconds for E2E tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testSequencer: '@jest/test-sequencer/jest',
  maxWorkers: 1, // Run tests sequentially for E2E
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
