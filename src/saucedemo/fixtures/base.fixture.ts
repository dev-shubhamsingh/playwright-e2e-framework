import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutInfoPage } from '../pages/CheckoutInfoPage';
import { CheckoutOverviewPage } from '../pages/CheckoutOverviewPage';
import { CheckoutCompletePage } from '../pages/CheckoutCompletePage';
import { MenuComponent } from '../pages/MenuComponent';

/**
 * PageFixtures defines the shape of every fixture we inject into tests.
 *
 * Each entry here becomes a parameter you can destructure in any test:
 *   test('my test', async ({ loginPage, inventoryPage }) => { ... })
 *
 * Playwright creates a fresh instance per test and disposes it automatically.
 * You never need to call `new LoginPage(page)` inside a test again.
 */
type PageFixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  productDetailPage: ProductDetailPage;
  cartPage: CartPage;
  checkoutInfoPage: CheckoutInfoPage;
  checkoutOverviewPage: CheckoutOverviewPage;
  checkoutCompletePage: CheckoutCompletePage;
  menuComponent: MenuComponent;
};

export const test = base.extend<PageFixtures>({
  // Each fixture receives the built-in `page` from Playwright
  // and calls `use()` to hand the instance to the test.
  // After the test finishes, Playwright automatically disposes the page.

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },

  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  checkoutInfoPage: async ({ page }, use) => {
    await use(new CheckoutInfoPage(page));
  },

  checkoutOverviewPage: async ({ page }, use) => {
    await use(new CheckoutOverviewPage(page));
  },

  checkoutCompletePage: async ({ page }, use) => {
    await use(new CheckoutCompletePage(page));
  },

  menuComponent: async ({ page }, use) => {
    await use(new MenuComponent(page));
  },
});

export { expect } from '@playwright/test';
