import { authTest as test, expect } from '@saucedemo/fixtures';
import { PRODUCTS } from '@saucedemo/data/products';

/**
 * Product Detail Test Suite — single product view.
 *
 * Covered:
 *   📄 Detail content    — name, description, price match the catalogue
 *   🛒 Add / remove      — button toggles and cart badge updates
 *   🔙 Navigation        — back button returns to inventory
 */
test.describe('Product Detail', () => {
  // Open the backpack detail page before each test
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.openProductByName(PRODUCTS.backpack.name);
  });

  test.describe('Content', () => {
    test('shows the correct product name', async ({ productDetailPage }) => {
      expect(await productDetailPage.getName()).toBe(PRODUCTS.backpack.name);
    });

    test('shows the correct product price', async ({ productDetailPage }) => {
      expect(await productDetailPage.getPrice()).toBe(PRODUCTS.backpack.price);
    });

    test('shows a non-empty description', async ({ productDetailPage }) => {
      const description = await productDetailPage.getDescription();
      expect(description.length).toBeGreaterThan(0);
    });
  });

  test.describe('Cart actions', () => {
    test('add to cart shows the Remove button and updates badge', async ({
      productDetailPage,
    }) => {
      await productDetailPage.addToCart();

      expect(await productDetailPage.isRemoveVisible()).toBe(true);
      expect(await productDetailPage.isAddToCartVisible()).toBe(false);
      expect(await productDetailPage.getCartCount()).toBe(1);
    });

    test('remove from cart restores the Add button and clears badge', async ({
      productDetailPage,
    }) => {
      await productDetailPage.addToCart();
      expect(await productDetailPage.getCartCount()).toBe(1);

      await productDetailPage.removeFromCart();
      expect(await productDetailPage.isAddToCartVisible()).toBe(true);
    });
  });

  test.describe('Navigation', () => {
    test('back button returns to the inventory page', async ({
      productDetailPage,
      authenticatedPage,
    }) => {
      await productDetailPage.goBackToProducts();
      expect(await authenticatedPage.getPageTitle()).toBe('Products');
    });
  });
});
