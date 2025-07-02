// Mock console methods to prevent noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up environment variables after each test
afterEach(() => {
  delete process.env.FLATFILE_API_KEY;
  delete process.env.FLATFILE_ENVIRONMENT_ID;
  delete process.env.WEBHOOK_SITE_URL;
}); 