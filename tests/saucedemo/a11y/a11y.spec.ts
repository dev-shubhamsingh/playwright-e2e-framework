import { authTest as test, expect } from '@saucedemo/fixtures';
import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { PRODUCTS } from '@saucedemo/data/products';

/**
 * Accessibility — axe-core WCAG scans of the authenticated SauceDemo pages.
 *
 * Runs in the dedicated `a11y` project (Chromium). Each test scans against
 * WCAG 2.0/2.1 A + AA rules, attaches the full axe result to the report
 * (surfaced in Allure), and fails on any *new* `critical` violation.
 *
 * SauceDemo is a third-party app we can't fix, and it ships a known critical
 * defect (the inventory sort `<select>` has no accessible name → `select-name`).
 * Rather than ignore criticals wholesale, we baseline the known ones per page:
 * the suite still fails if a *new* critical appears — a real regression guard,
 * not a rubber stamp.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Documented, accepted critical violations per page (rule ids). */
const KNOWN_CRITICAL: Record<string, string[]> = {
  // SauceDemo bug: the product-sort dropdown has no label / accessible name.
  inventory: ['select-name'],
  cart: [],
  'checkout-overview': [],
};

async function scanCriticals(page: Page, info: TestInfo, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  await info.attach(`axe-${label}`, {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });

  const critical = violations
    .filter((v) => v.impact === 'critical')
    .map((v) => v.id);
  const allowed = KNOWN_CRITICAL[label] ?? [];
  // Only *unexpected* criticals should fail the test.
  return critical.filter((id) => !allowed.includes(id));
}

test.describe('Accessibility (axe-core)', { tag: '@a11y' }, () => {
  test('inventory page has no new critical violations', async ({
    authenticatedPage,
    page,
  }, testInfo) => {
    await expect(authenticatedPage.getProductCount()).resolves.toBeGreaterThan(
      0,
    );
    expect(await scanCriticals(page, testInfo, 'inventory')).toEqual([]);
  });

  test('cart page has no new critical violations', async ({
    authenticatedPage,
    cartPage,
    page,
  }, testInfo) => {
    await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
    await authenticatedPage.goToCart();
    await expect(cartPage.getPageTitle()).resolves.toBe('Your Cart');
    expect(await scanCriticals(page, testInfo, 'cart')).toEqual([]);
  });

  test('checkout overview has no new critical violations', async ({
    authenticatedPage,
    cartPage,
    checkoutInfoPage,
    checkoutOverviewPage,
    page,
  }, testInfo) => {
    await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
    await authenticatedPage.goToCart();
    await cartPage.checkout();
    await checkoutInfoPage.fillAndContinue('Ada', 'Lovelace', '94043');
    await expect(checkoutOverviewPage.getPageTitle()).resolves.toBe(
      'Checkout: Overview',
    );
    expect(await scanCriticals(page, testInfo, 'checkout-overview')).toEqual(
      [],
    );
  });
});
