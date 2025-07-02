import { requireEnvVars } from '../../utils/require-env-vars';

describe('requireEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should not throw when all required environment variables are set', () => {
    process.env.TEST_VAR_1 = 'value1';
    process.env.TEST_VAR_2 = 'value2';

    expect(() => {
      requireEnvVars(['TEST_VAR_1', 'TEST_VAR_2']);
    }).not.toThrow();
  });

  it('should throw when a required environment variable is missing', () => {
    process.env.TEST_VAR_1 = 'value1';
    // TEST_VAR_2 is intentionally not set

    expect(() => {
      requireEnvVars(['TEST_VAR_1', 'TEST_VAR_2']);
    }).toThrow('Environment variable TEST_VAR_2 is not set.');
  });

  it('should handle empty array of environment variables', () => {
    expect(() => {
      requireEnvVars([]);
    }).not.toThrow();
  });
}); 