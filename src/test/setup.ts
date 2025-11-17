import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock electron IPC for tests
global.window = global.window || {};
(global.window as any).electron = {
  ipcRenderer: {
    on: vi.fn(),
    send: vi.fn(),
    removeListener: vi.fn(),
  },
};
