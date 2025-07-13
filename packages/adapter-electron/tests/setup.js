// Test setup file for vitest
import { vi } from 'vitest';

// Mock __dirname for ES modules
global.__dirname = process.cwd();

// Mock process.env defaults
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Global test utilities
global.mockElectronRequest = (overrides = {}) => ({
  url: 'http://127.0.0.1/test',
  method: 'GET',
  headers: new Map(),
  body: null,
  uploadData: [],
  ...overrides
});

global.mockElectronSession = (overrides = {}) => ({
  cookies: {
    get: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue(),
    remove: vi.fn().mockResolvedValue()
  },
  ...overrides
});

// Suppress console.error in tests unless specifically testing error handling
const originalConsoleError = console.error;
console.error = (...args) => {
  if (process.env.VITEST_SHOW_ERRORS === 'true') {
    originalConsoleError(...args);
  }
}; 