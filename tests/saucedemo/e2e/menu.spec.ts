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
test.describe('Side Menu', () => {

  test.describe('Reset App State', () => {

    test('clears items from the cart', async ({ authenticatedPage, menuComponent }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.addToCartByName(PRODUCTS.bikeLight.name);
      expect(await authenticatedPage.getCartCount()).toBe(2);

      await menuComponent.resetAppState();

      // After reset the badge should be gone
      expect(await authenticatedPage.isCartBadgeVisible()).toBe(false);
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
      expect(await productDetailPage.getName()).toBe(PRODUCTS.backpack.name);

      // Use the menu to go back to All Items
      await menuComponent.goToAllItems();
      expect(await authenticatedPage.getPageTitle()).toBe('Products');
    });

  });

  test.describe('Logout', () => {

    test('returns the user to the login page', async ({ menuComponent, page }) => {
      await menuComponent.logout();
      await expect(page).toHaveURL('https://www.saucedemo.com/');
      await expect(page.getByTestId('login-button')).toBeVisible();
    });

  });

});
