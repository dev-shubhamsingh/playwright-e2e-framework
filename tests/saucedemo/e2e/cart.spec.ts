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
test.describe('Cart', { tag: '@regression' }, () => {
  test.describe('Contents', () => {
    test(
      'items added on inventory appear in the cart',
      { tag: '@smoke' },
      async ({ authenticatedPage, cartPage }) => {
        await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
        await authenticatedPage.addToCartByName(PRODUCTS.bikeLight.name);
        await authenticatedPage.goToCart();

        await expect(cartPage.cartItems).toHaveCount(2);
        await expect
          .poll(() => cartPage.getItemNames())
          .toEqual(
            expect.arrayContaining([
              PRODUCTS.backpack.name,
              PRODUCTS.bikeLight.name,
            ]),
          );
      },
    );

    test('cart page title reads "Your Cart"', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.goToCart();
      await expect(cartPage.pageTitle).toHaveText('Your Cart');
    });

    test('cart prices match the product catalogue', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();

      await expect
        .poll(() => cartPage.getItemPrices())
        .toContain(PRODUCTS.backpack.price);
    });

    test('each item has a quantity of 1', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();

      await expect
        .poll(() => cartPage.getItemQuantity(PRODUCTS.backpack.name))
        .toBe(1);
    });

    test('an untouched cart is empty', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.goToCart();
      await expect(cartPage.cartItems).toHaveCount(0);
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
      await expect(cartPage.cartItems).toHaveCount(2);

      await cartPage.removeItem(PRODUCTS.backpack.name);

      await expect(cartPage.cartItems).toHaveCount(1);
      await expect
        .poll(() => cartPage.getItemNames())
        .not.toContain(PRODUCTS.backpack.name);
    });

    test('removing all items empties the cart', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();

      await cartPage.removeItem(PRODUCTS.backpack.name);
      await expect(cartPage.cartItems).toHaveCount(0);
    });
  });

  test.describe('Navigation', () => {
    test('continue shopping returns to inventory', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.goToCart();
      await cartPage.continueShopping();
      await expect(authenticatedPage.pageTitle).toHaveText('Products');
    });

    test('checkout proceeds to the customer information page', async ({
      authenticatedPage,
      cartPage,
      checkoutInfoPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();
      await cartPage.checkout();

      await expect(checkoutInfoPage.pageTitle).toHaveText(
        'Checkout: Your Information',
      );
    });
  });
});
