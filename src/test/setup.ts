// Jest test setup file
import 'whatwg-fetch';

// Chrome Extension API mocks
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  action: {
    onClicked: {
      addListener: jest.fn(),
    },
  },
} as any;

// DOM API extensions
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'github.com',
    href: 'https://github.com/test/repo',
    pathname: '/test/repo',
  },
  writable: true,
});

// Console spy for testing
beforeEach(() => {
  jest.clearAllMocks();
});

export {};