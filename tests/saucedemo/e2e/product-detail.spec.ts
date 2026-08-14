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
test.describe('Product Detail', { tag: '@regression' }, () => {
  // Open the backpack detail page before each test
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.openProductByName(PRODUCTS.backpack.name);
  });

  test.describe('Content', () => {
    test(
      'shows the correct product name',
      { tag: '@smoke' },
      async ({ productDetailPage }) => {
        await expect(productDetailPage.productName).toHaveText(
          PRODUCTS.backpack.name,
        );
      },
    );

    test('shows the correct product price', async ({ productDetailPage }) => {
      // The rendered price carries a currency prefix; assert the value the
      // page object parses, polled so a late render does not fail the read.
      await expect
        .poll(() => productDetailPage.getPrice())
        .toBe(PRODUCTS.backpack.price);
    });

    test('shows a non-empty description', async ({ productDetailPage }) => {
      await expect
        .poll(async () => (await productDetailPage.getDescription()).length)
        .toBeGreaterThan(0);
    });
  });

  test.describe('Cart actions', () => {
    test('add to cart shows the Remove button and updates badge', async ({
      productDetailPage,
    }) => {
      await productDetailPage.addToCart();

      await expect(productDetailPage.removeButton).toBeVisible();
      await expect(productDetailPage.addToCartButton).toBeHidden();
      await expect(productDetailPage.cartBadge).toHaveText('1');
    });

    test('remove from cart restores the Add button and clears badge', async ({
      productDetailPage,
    }) => {
      await productDetailPage.addToCart();
      await expect(productDetailPage.cartBadge).toHaveText('1');

      await productDetailPage.removeFromCart();
      await expect(productDetailPage.addToCartButton).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('back button returns to the inventory page', async ({
      productDetailPage,
      authenticatedPage,
    }) => {
      await productDetailPage.goBackToProducts();
      await expect(authenticatedPage.pageTitle).toHaveText('Products');
    });
  });
});
