import { authTest as test, expect } from '@saucedemo/fixtures';
import { PRODUCTS, TAX_RATE } from '@saucedemo/data/products';
import { TestDataFactory } from '@shared/utils/test-data.factory';
import { sumPrices, roundTo } from '@shared/utils/helpers';

/**
 * Checkout Test Suite — the full purchase journey.
 *
 * This is the crown-jewel E2E flow:
 *   inventory → cart → checkout info → overview → complete
 *
 * Customer data is generated fresh per test with Faker (TestDataFactory),
 * so every run exercises different names/zips and we never rely on
 * hard-coded magic values.
 *
 * Covered:
 *   ✅ Happy path        — complete a full order end to end
 *   🧮 Totals            — item total, tax (8%), and grand total are correct
 *   ❌ Validation        — missing fields are rejected with the right errors
 *   🔙 Cancel / back     — user can abandon checkout at each step
 */
test.describe('Checkout', { tag: '@regression' }, () => {
  test.describe('Happy path', () => {
    test(
      'completes a full single-item order',
      { tag: '@smoke' },
      async ({
        authenticatedPage,
        cartPage,
        checkoutInfoPage,
        checkoutOverviewPage,
        checkoutCompletePage,
      }) => {
        const customer = TestDataFactory.buildCheckoutInfo();

        await test.step('Add item and open cart', async () => {
          await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
          await authenticatedPage.goToCart();
          expect(await cartPage.getItemCount()).toBe(1);
        });

        await test.step('Proceed through customer info', async () => {
          await cartPage.checkout();
          await checkoutInfoPage.fillAndContinue(
            customer.firstName,
            customer.lastName,
            customer.postalCode,
          );
        });

        await test.step('Verify order overview and place order', async () => {
          expect(await checkoutOverviewPage.getPageTitle()).toBe(
            'Checkout: Overview',
          );
          expect(await checkoutOverviewPage.getItemCount()).toBe(1);
          await checkoutOverviewPage.finish();
        });

        await test.step('Verify order confirmation', async () => {
          expect(await checkoutCompletePage.getPageTitle()).toBe(
            'Checkout: Complete!',
          );
          expect(await checkoutCompletePage.getConfirmationHeader()).toContain(
            'Thank you for your order',
          );
          expect(await checkoutCompletePage.isConfirmationImageVisible()).toBe(
            true,
          );
        });
      },
    );

    test('completes a multi-item order', async ({
      authenticatedPage,
      cartPage,
      checkoutInfoPage,
      checkoutOverviewPage,
      checkoutCompletePage,
    }) => {
      const customer = TestDataFactory.buildCheckoutInfo();
      const items = [
        PRODUCTS.backpack,
        PRODUCTS.bikeLight,
        PRODUCTS.fleeceJacket,
      ];

      for (const item of items) {
        await authenticatedPage.addToCartByName(item.name);
      }
      await authenticatedPage.goToCart();
      await cartPage.checkout();
      await checkoutInfoPage.fillAndContinue(
        customer.firstName,
        customer.lastName,
        customer.postalCode,
      );

      expect(await checkoutOverviewPage.getItemCount()).toBe(items.length);
      await checkoutOverviewPage.finish();
      expect(await checkoutCompletePage.getConfirmationHeader()).toContain(
        'Thank you for your order',
      );
    });
  });

  test.describe('Order totals', () => {
    test('item total, tax, and grand total are calculated correctly', async ({
      authenticatedPage,
      cartPage,
      checkoutInfoPage,
      checkoutOverviewPage,
    }) => {
      const customer = TestDataFactory.buildCheckoutInfo();
      const items = [PRODUCTS.backpack, PRODUCTS.boltShirt];
      const expectedSubtotal = sumPrices(items.map((i) => i.price));
      const expectedTax = roundTo(expectedSubtotal * TAX_RATE, 2);
      const expectedTotal = roundTo(expectedSubtotal + expectedTax, 2);

      for (const item of items) {
        await authenticatedPage.addToCartByName(item.name);
      }
      await authenticatedPage.goToCart();
      await cartPage.checkout();
      await checkoutInfoPage.fillAndContinue(
        customer.firstName,
        customer.lastName,
        customer.postalCode,
      );

      await test.step('Verify item subtotal', async () => {
        expect(await checkoutOverviewPage.getItemTotal()).toBe(
          expectedSubtotal,
        );
      });

      await test.step('Verify 8% tax', async () => {
        expect(await checkoutOverviewPage.getTax()).toBe(expectedTax);
      });

      await test.step('Verify grand total = subtotal + tax', async () => {
        expect(await checkoutOverviewPage.getOrderTotal()).toBe(expectedTotal);
      });
    });
  });

  test.describe('Information validation', () => {
    /**
     * Data-driven negative tests — each missing field has its own error.
     * The factory pins ONE field to empty and randomises the rest.
     */
    const validationCases = [
      {
        label: 'missing first name',
        data: () => TestDataFactory.buildCheckoutInfo({ firstName: '' }),
        error: 'First Name is required',
      },
      {
        label: 'missing last name',
        data: () => TestDataFactory.buildCheckoutInfo({ lastName: '' }),
        error: 'Last Name is required',
      },
      {
        label: 'missing postal code',
        data: () => TestDataFactory.buildCheckoutInfo({ postalCode: '' }),
        error: 'Postal Code is required',
      },
    ];

    for (const { label, data, error } of validationCases) {
      test(`rejects checkout with ${label}`, async ({
        authenticatedPage,
        cartPage,
        checkoutInfoPage,
      }) => {
        const customer = data();

        await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
        await authenticatedPage.goToCart();
        await cartPage.checkout();
        await checkoutInfoPage.fillAndContinue(
          customer.firstName,
          customer.lastName,
          customer.postalCode,
        );

        expect(await checkoutInfoPage.hasError()).toBe(true);
        expect(await checkoutInfoPage.getErrorMessage()).toContain(error);
      });
    }
  });

  test.describe('Cancel and back navigation', () => {
    test('cancel on info page returns to the cart', async ({
      authenticatedPage,
      cartPage,
      checkoutInfoPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();
      await cartPage.checkout();
      await checkoutInfoPage.cancel();

      expect(await cartPage.getPageTitle()).toBe('Your Cart');
    });

    test('cancel on overview page returns to inventory', async ({
      authenticatedPage,
      cartPage,
      checkoutInfoPage,
      checkoutOverviewPage,
    }) => {
      const customer = TestDataFactory.buildCheckoutInfo();

      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();
      await cartPage.checkout();
      await checkoutInfoPage.fillAndContinue(
        customer.firstName,
        customer.lastName,
        customer.postalCode,
      );
      await checkoutOverviewPage.cancel();

      expect(await authenticatedPage.getPageTitle()).toBe('Products');
    });
  });

  test.describe('Post-order', () => {
    test('back home after order returns to inventory', async ({
      authenticatedPage,
      cartPage,
      checkoutInfoPage,
      checkoutOverviewPage,
      checkoutCompletePage,
    }) => {
      const customer = TestDataFactory.buildCheckoutInfo();

      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.goToCart();
      await cartPage.checkout();
      await checkoutInfoPage.fillAndContinue(
        customer.firstName,
        customer.lastName,
        customer.postalCode,
      );
      await checkoutOverviewPage.finish();
      await checkoutCompletePage.backToHome();

      expect(await authenticatedPage.getPageTitle()).toBe('Products');
    });
  });
});
