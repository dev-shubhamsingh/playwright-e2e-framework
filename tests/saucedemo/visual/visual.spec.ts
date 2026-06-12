import { authTest as test, expect } from '@saucedemo/fixtures';
import { PRODUCTS } from '@saucedemo/data/products';

/**
 * Visual regression — pixel snapshots of stable SauceDemo pages.
 *
 * Runs in the dedicated `visual` project (Chromium only): pixel output is
 * OS/browser-specific, so a single engine keeps baselines deterministic.
 * `animations: 'disabled'` freezes transitions, and a small
 * `maxDiffPixelRatio` absorbs sub-pixel antialiasing noise without hiding real
 * regressions. Baselines are committed; regenerate with
 * `npm run test:visual:update`.
 */
test.describe('Visual regression', { tag: '@visual' }, () => {
  const shot = {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
  } as const;

  test('inventory page', async ({ authenticatedPage, page }) => {
    // authenticatedPage lands on /inventory.html with an empty cart.
    await expect(authenticatedPage.getProductCount()).resolves.toBeGreaterThan(
      0,
    );
    await expect(page).toHaveScreenshot('inventory.png', shot);
  });

  test('product detail page', async ({ authenticatedPage, page }) => {
    await authenticatedPage.openProductByName(PRODUCTS.backpack.name);
    await expect(page).toHaveScreenshot('product-detail.png', shot);
  });

  test('empty cart page', async ({ authenticatedPage, cartPage, page }) => {
    await authenticatedPage.goToCart();
    await expect(cartPage.getPageTitle()).resolves.toBe('Your Cart');
    await expect(page).toHaveScreenshot('cart-empty.png', shot);
  });
});
