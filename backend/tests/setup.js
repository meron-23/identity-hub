/**
 * Jest Test Setup
 * Configures test environment
 */

// Set test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    // Keep log for test output
    log: originalConsole.log,
    // Suppress warnings during tests
    warn: jest.fn(),
    error: originalConsole.error, // Keep errors for debugging
    info: jest.fn(),
    debug: jest.fn()
  };
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
