/**
 * SauceDemo test user accounts.
 *
 * SauceDemo ships with intentional user types — each behaves differently.
 * This is a great showcase of data-driven testing:
 * the same test steps produce different outcomes depending on the user.
 *
 * All users share the same password: secret_sauce
 */

export interface User {
  username: string;
  password: string;
  description: string;
}

export const USERS = {
  /**
   * Standard working user — all flows should pass.
   */
  standard: {
    username: process.env.TEST_USER ?? 'standard_user',
    password: process.env.TEST_PASSWORD ?? 'secret_sauce',
    description: 'Standard user with full access',
  },

  /**
   * Locked out — login should fail with an error message.
   */
  lockedOut: {
    username: 'locked_out_user',
    password: 'secret_sauce',
    description: 'User blocked from logging in',
  },

  /**
   * Problem user — UI has broken elements (wrong images, etc.)
   * Good for testing resilience against unexpected states.
   */
  problem: {
    username: 'problem_user',
    password: 'secret_sauce',
    description: 'User that exposes UI bugs',
  },

  /**
   * Performance glitch user — login is intentionally delayed (~5s).
   * Good for testing timeout handling.
   */
  performanceGlitch: {
    username: 'performance_glitch_user',
    password: 'secret_sauce',
    description: 'User with slow login response',
  },

  /**
   * Error user — certain actions trigger errors mid-flow.
   */
  error: {
    username: 'error_user',
    password: 'secret_sauce',
    description: 'User that triggers action errors',
  },

  /**
   * Visual user — UI has visual regressions (wrong colours, layouts).
   * Reserved for visual regression test suite.
   */
  visual: {
    username: 'visual_user',
    password: 'secret_sauce',
    description: 'User with visual UI differences',
  },
} satisfies Record<string, User>;

/**
 * Invalid credential sets used for negative login tests.
 */
export const INVALID_CREDENTIALS = [
  {
    username: 'invalid_user',
    password: 'secret_sauce',
    expectedError:
      'Username and password do not match any user in this service',
  },
  {
    username: '',
    password: 'secret_sauce',
    expectedError: 'Username is required',
  },
  {
    username: 'standard_user',
    password: '',
    expectedError: 'Password is required',
  },
  {
    username: '',
    password: '',
    expectedError: 'Username is required',
  },
];
