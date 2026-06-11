/**
 * Barrel export — single import point for all fixtures.
 *
 * Tests import from here instead of individual fixture files:
 *
 *   // instead of:
 *   import { test, expect } from '../../../src/fixtures/base.fixture'
 *
 *   // just:
 *   import { test, expect } from '../../src/fixtures'
 *
 * Which fixture should a test use?
 *
 *   base  → login tests, or any test that controls its own navigation
 *   auth  → all tests that need to start already logged in
 */
export { test as baseTest, expect } from './base.fixture';
export { test as authTest } from './auth.fixture';
