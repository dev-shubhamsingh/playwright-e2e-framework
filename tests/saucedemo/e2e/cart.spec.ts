import { authTest as test, expect } from '@saucedemo/fixtures';
import { PRODUCTS } from '@saucedemo/data/products';

/**
 * Cart Test Suite — the shopping cart page.
 *
 * Covered:
 *   📋 Contents      — items added on inventory appear in the cart
 *   💲 Prices        — cart prices match the catalogue
 *   🗑️ Remove        — items can be removed from within the cart
 *   🔀 Navigation    — continue shopping / proceed to checkout
 */
test.describe('Cart', () => {
  test.describe('Contents', () => {
    test('items added on inventory appear in the cart', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.addToCartByName(PRODUCTS.bikeLight.name);
      await authenticatedPage.goToCart();

      expect(await cartPage.getItemCount()).toBe(2);
      const names = await cartPage.getItemNames();
      expect(names).toContain(PRODUCTS.backpack.name);
      expect(names).toContain(PRODUCTS.bikeLight.name);
    });

    test('cart page title reads "Your Cart"', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.goToCart();
      expect(await cartPage.getPageTitle()).toBe('Your Cart');
    });

    test('cart prices match the product catalogue', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();

      const prices = await cartPage.getItemPrices();
      expect(prices).toContain(PRODUCTS.backpack.price);
    });

    test('each item has a quantity of 1', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();

      expect(await cartPage.getItemQuantity(PRODUCTS.backpack.name)).toBe(1);
    });

    test('an untouched cart is empty', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.goToCart();
      expect(await cartPage.isEmpty()).toBe(true);
    });
  });

  test.describe('Remove items', () => {
    test('removing an item updates the cart count', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.addToCartByName(PRODUCTS.bikeLight.name);
      await authenticatedPage.goToCart();
      expect(await cartPage.getItemCount()).toBe(2);

      await cartPage.removeItem(PRODUCTS.backpack.name);
      expect(await cartPage.getItemCount()).toBe(1);
      expect(await cartPage.getItemNames()).not.toContain(
        PRODUCTS.backpack.name,
      );
    });

    test('removing all items empties the cart', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();

      await cartPage.removeItem(PRODUCTS.backpack.name);
      expect(await cartPage.isEmpty()).toBe(true);
    });
  });

  test.describe('Navigation', () => {
    test('continue shopping returns to inventory', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.goToCart();
      await cartPage.continueShopping();
      expect(await authenticatedPage.getPageTitle()).toBe('Products');
    });

    test('checkout proceeds to the customer information page', async ({
      authenticatedPage,
      cartPage,
      checkoutInfoPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();
      await cartPage.checkout();

      expect(await checkoutInfoPage.getPageTitle()).toBe(
        'Checkout: Your Information',
      );
    });
  });
});
