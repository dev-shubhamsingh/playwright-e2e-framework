import { authTest as test, expect } from '@saucedemo/fixtures';
import { PRODUCTS, PRODUCT_COUNT } from '@saucedemo/data/products';

/**
 * Inventory Test Suite — the product listing page.
 *
 * Every test starts already logged in (via storageState) and lands on
 * /inventory.html through the `authenticatedPage` fixture.
 *
 * Covered:
 *   📦 Product display    — count, names, prices
 *   🔃 Sorting            — A-Z, Z-A, price low-high, high-low
 *   🛒 Add / remove cart  — badge updates correctly
 *   🔗 Navigation         — open product detail
 */
test.describe('Inventory', () => {
  test.describe('Product display', () => {
    test('displays all six products', async ({ authenticatedPage }) => {
      expect(await authenticatedPage.getProductCount()).toBe(PRODUCT_COUNT);
    });

    test('page title reads "Products"', async ({ authenticatedPage }) => {
      expect(await authenticatedPage.getPageTitle()).toBe('Products');
    });

    test('all expected product names are present', async ({
      authenticatedPage,
    }) => {
      const names = await authenticatedPage.getProductNames();
      for (const product of Object.values(PRODUCTS)) {
        expect(names).toContain(product.name);
      }
    });

    test('cart badge is hidden when cart is empty', async ({
      authenticatedPage,
    }) => {
      expect(await authenticatedPage.isCartBadgeVisible()).toBe(false);
    });
  });

  test.describe('Sorting', () => {
    test('sorts products by name A to Z', async ({ authenticatedPage }) => {
      await authenticatedPage.sortBy('az');
      const names = await authenticatedPage.getProductNames();
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    test('sorts products by name Z to A', async ({ authenticatedPage }) => {
      await authenticatedPage.sortBy('za');
      const names = await authenticatedPage.getProductNames();
      const sorted = [...names].sort((a, b) => b.localeCompare(a));
      expect(names).toEqual(sorted);
    });

    test('sorts products by price low to high', async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.sortBy('lohi');
      const prices = await authenticatedPage.getProductPrices();
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
    });

    test('sorts products by price high to low', async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.sortBy('hilo');
      const prices = await authenticatedPage.getProductPrices();
      const sorted = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sorted);
    });
  });

  test.describe('Add and remove from cart', () => {
    test('adding a product increments the cart badge', async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      expect(await authenticatedPage.getCartCount()).toBe(1);
    });

    test('adding multiple products updates the badge count', async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.addToCartByName(PRODUCTS.bikeLight.name);
      await authenticatedPage.addToCartByName(PRODUCTS.onesie.name);
      expect(await authenticatedPage.getCartCount()).toBe(3);
    });

    test('removing a product decrements the cart badge', async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.addToCartByName(PRODUCTS.bikeLight.name);
      expect(await authenticatedPage.getCartCount()).toBe(2);

      await authenticatedPage.removeFromCartByName(PRODUCTS.backpack.name);
      expect(await authenticatedPage.getCartCount()).toBe(1);
    });

    test('badge disappears after removing the last item', async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      expect(await authenticatedPage.getCartCount()).toBe(1);

      await authenticatedPage.removeFromCartByName(PRODUCTS.backpack.name);
      expect(await authenticatedPage.isCartBadgeVisible()).toBe(false);
    });
  });

  test.describe('Navigation', () => {
    test('clicking a product opens its detail page', async ({
      authenticatedPage,
      productDetailPage,
    }) => {
      await authenticatedPage.openProductByName(PRODUCTS.backpack.name);
      expect(await productDetailPage.getName()).toBe(PRODUCTS.backpack.name);
    });
  });
});
