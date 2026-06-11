import { test as base } from './base.fixture';
import { InventoryPage } from '../pages/InventoryPage';

/**
 * AuthFixtures — extends base fixtures with pre-authenticated state.
 *
 * HOW IT WORKS:
 *   global-setup.ts runs once before the suite and saves the logged-in
 *   browser session to .auth/standard_user.json.
 *
 *   The 'authenticated' project in playwright.config.ts loads that file
 *   as storageState — so every page.goto() in those tests starts with
 *   the user already logged in.
 *
 *   This fixture simply navigates to inventory and hands it to the test.
 *   No credentials, no UI login, no repetition.
 *
 * SRP: this fixture's only job is "give me an authenticated landing page".
 * DRY: login logic lives in global-setup.ts exactly once.
 * Isolation: each test gets a fresh browser context that reloads storageState
 *   from disk. Since the saved session has an empty cart, every test starts
 *   clean automatically — no teardown/reset needed.
 *
 * Usage (any non-login spec):
 *   import { authTest as test, expect } from '@saucedemo/fixtures'
 *   test('cart test', async ({ authenticatedPage, cartPage }) => {
 *     await authenticatedPage.addToCartByName('Sauce Labs Backpack')
 *   })
 */

type AuthFixtures = {
  authenticatedPage: InventoryPage;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // storageState is already injected by the 'authenticated' project config.
    // Just navigate to the start page — user is already logged in.
    await page.goto('/inventory.html');

    await use(new InventoryPage(page));

    // No teardown required: the next test gets a fresh context with a clean
    // session loaded from .auth/standard_user.json (empty cart). Adding a
    // logout/reset here would break tests that intentionally end on another
    // page (e.g. the logout test landing on the login screen).
  },
});

export { expect } from '@playwright/test';
