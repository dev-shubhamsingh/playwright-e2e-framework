import { test, expect } from '@dummyjson/fixtures';
import {
  cartListSchema,
  cartSchema,
  deletedCartSchema,
  errorResponseSchema,
} from '@dummyjson/schemas';

/**
 * Carts endpoint integration tests against DummyJSON.
 *
 * Covers the list envelope, single-cart retrieval, carts-by-user, the 404
 * negative case, and the simulated create/update/delete write flows. DummyJSON
 * does not persist writes, so write tests assert on the returned contract and
 * computed totals rather than re-fetching.
 */
test.describe('Carts API', () => {
  test('lists carts with a valid pagination envelope', async ({
    cartsClient,
  }) => {
    const response = await cartsClient.list();

    expect(response.status()).toBe(200);

    const body = cartListSchema.parse(await response.json());
    expect(body.carts.length).toBeGreaterThan(0);
    expect(body.carts.length).toBeLessThanOrEqual(body.limit);
    expect(body.total).toBeGreaterThanOrEqual(body.carts.length);
  });

  test('paginates with limit and skip', async ({ cartsClient }) => {
    const limit = 3;
    const skip = 2;

    const response = await cartsClient.list({ limit, skip });

    expect(response.status()).toBe(200);

    const body = cartListSchema.parse(await response.json());
    expect(body.limit).toBe(limit);
    expect(body.skip).toBe(skip);
    expect(body.carts.length).toBeLessThanOrEqual(limit);
  });

  test('returns a single cart by id', async ({ cartsClient }) => {
    const response = await cartsClient.getById(1);

    expect(response.status()).toBe(200);

    const cart = cartSchema.parse(await response.json());
    expect(cart.id).toBe(1);
    expect(cart.products).toHaveLength(cart.totalProducts);
  });

  test('returns the carts belonging to a user', async ({ cartsClient }) => {
    const userId = 1;

    const response = await cartsClient.getByUser(userId);

    expect(response.status()).toBe(200);

    const body = cartListSchema.parse(await response.json());
    for (const cart of body.carts) {
      expect(cart.userId).toBe(userId);
    }
  });

  test('returns 404 for a non-existent cart', async ({ cartsClient }) => {
    const response = await cartsClient.getById(0);

    expect(response.status()).toBe(404);

    const body = errorResponseSchema.parse(await response.json());
    expect(body.message).toMatch(/not found/i);
  });

  test('creates a cart and computes totals for the line items', async ({
    cartsClient,
  }) => {
    const response = await cartsClient.add({
      userId: 1,
      products: [
        { id: 144, quantity: 4 },
        { id: 98, quantity: 1 },
      ],
    });

    expect(response.status()).toBe(201);

    const cart = cartSchema.parse(await response.json());
    expect(cart.userId).toBe(1);
    expect(cart.totalProducts).toBe(2);
    expect(cart.totalQuantity).toBe(5);
    // Server-computed total must equal the sum of the line-item totals.
    const lineSum = cart.products.reduce((acc, p) => acc + p.total, 0);
    expect(cart.total).toBeCloseTo(lineSum, 2);
  });

  test('updates a cart by merging in a new line item', async ({
    cartsClient,
  }) => {
    const response = await cartsClient.update(1, [{ id: 144, quantity: 2 }]);

    expect(response.status()).toBe(200);

    const cart = cartSchema.parse(await response.json());
    expect(cart.id).toBe(1);
    expect(cart.products.some((p) => p.id === 144)).toBe(true);
  });

  test('deletes a cart and flags it as deleted', async ({ cartsClient }) => {
    const response = await cartsClient.remove(1);

    expect(response.status()).toBe(200);

    const cart = deletedCartSchema.parse(await response.json());
    expect(cart.id).toBe(1);
    expect(cart.isDeleted).toBe(true);
  });
});
