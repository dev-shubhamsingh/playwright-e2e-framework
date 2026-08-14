import { authTest as test, expect } from '@saucedemo/fixtures';
import { PRODUCTS } from '@saucedemo/data/products';

/**
 * Menu Test Suite — the hamburger side menu behaviour.
 *
 * Covered:
 *   🔄 Reset App State   — clears the cart badge
 *   🔗 All Items         — navigates back to inventory
 *   🚪 Logout            — returns to the login page
 */
test.describe('Side Menu', { tag: '@regression' }, () => {
  test.describe('Reset App State', () => {
    test('clears items from the cart', async ({
      authenticatedPage,
      menuComponent,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.addToCartByName(PRODUCTS.bikeLight.name);
      await expect(authenticatedPage.cartBadge).toHaveText('2');

      await menuComponent.resetAppState();

      // After reset the badge should be gone
      await expect(authenticatedPage.cartBadge).toBeHidden();
    });
  });

  test.describe('Navigation', () => {
    test('All Items returns to the inventory page', async ({
      authenticatedPage,
      productDetailPage,
      menuComponent,
    }) => {
      // Navigate away to a product detail page first
      await authenticatedPage.openProductByName(PRODUCTS.backpack.name);
      await expect(productDetailPage.productName).toHaveText(
        PRODUCTS.backpack.name,
      );

      // Use the menu to go back to All Items
      await menuComponent.goToAllItems();
      await expect(authenticatedPage.pageTitle).toHaveText('Products');
    });
  });

  test.describe('Logout', () => {
    test(
      'returns the user to the login page',
      { tag: '@smoke' },
      async ({ authenticatedPage, menuComponent, page }) => {
        // Start from a logged-in page so the side menu is available.
        await expect(authenticatedPage.pageTitle).toHaveText('Products');

        await menuComponent.logout();
        await expect(page).toHaveURL('https://www.saucedemo.com/');
        await expect(page.getByTestId('login-button')).toBeVisible();
      },
    );
  });
});
