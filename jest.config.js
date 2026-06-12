// @ts-check

/**
 * Jest config — used exclusively for the Pact consumer contract suite.
 * Playwright tests continue to run via `npx playwright test`.
 *
 * Pact's `PactV3.executeTest()` needs a describe/it harness to manage the
 * mock-server lifecycle; Jest is the runner the Pact ecosystem is built and
 * documented around. `moduleNameMapper` mirrors the tsconfig path aliases so
 * contract specs import shared config/schemas the same way the rest of the
 * codebase does.
 *
 * Kept as .js (not .ts) so Jest doesn't require ts-node just to read its config.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/dummyjson/contract/**/*.pact.ts'],
  // Load .env before specs run so the zod env config resolves (defaults cover
  // every var, so this only matters when a local .env overrides them).
  setupFiles: ['dotenv/config'],
  moduleNameMapper: {
    // Pact's root export drags in the provider verifier → https-proxy-agent
    // (ESM build Jest can't transform). Consumer tests never use a proxy, so
    // stub it. See tests/dummyjson/contract/stubs/https-proxy-agent.js.
    '^https-proxy-agent$':
      '<rootDir>/tests/dummyjson/contract/stubs/https-proxy-agent.js',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@config/(.*)$': '<rootDir>/src/core/config/$1',
    '^@saucedemo/(.*)$': '<rootDir>/src/saucedemo/$1',
    '^@dummyjson/(.*)$': '<rootDir>/src/dummyjson/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  testTimeout: 30_000,
};
