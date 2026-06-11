import { test, expect } from '@dummyjson/fixtures';
import {
  errorResponseSchema,
  paginationEnvelopeSchema,
  productListSchema,
  productSchema,
} from '@dummyjson/schemas';

/**
 * Products endpoint integration tests against DummyJSON.
 *
 * Covers the list envelope, pagination, search, sorting, single-resource
 * retrieval, and a 404 negative case. Bodies are validated against zod schemas
 * alongside status-code and value assertions.
 */
test.describe('Products API', () => {
  test('lists products with a valid pagination envelope', async ({
    productsClient,
  }) => {
    const response = await productsClient.list();

    expect(response.status()).toBe(200);

    const body = productListSchema.parse(await response.json());
    expect(body.products.length).toBeGreaterThan(0);
    expect(body.products.length).toBeLessThanOrEqual(body.limit);
    expect(body.total).toBeGreaterThan(body.products.length);
  });

  test('paginates with limit and skip', async ({ productsClient }) => {
    const limit = 5;
    const skip = 10;

    const response = await productsClient.list({ limit, skip });

    expect(response.status()).toBe(200);

    const body = productListSchema.parse(await response.json());
    expect(body.limit).toBe(limit);
    expect(body.skip).toBe(skip);
    expect(body.products).toHaveLength(limit);
  });

  test('searches products by query', async ({ productsClient }) => {
    const response = await productsClient.search('mascara');

    expect(response.status()).toBe(200);

    const body = productListSchema.parse(await response.json());
    expect(body.total).toBeGreaterThan(0);
    // Every hit should reference the query in its title or description.
    for (const product of body.products) {
      const haystack = `${product.title} ${product.description}`.toLowerCase();
      expect(haystack).toContain('mascara');
    }
  });

  test('sorts products by title ascending', async ({ productsClient }) => {
    const response = await productsClient.list({
      sortBy: 'title',
      order: 'asc',
      limit: 15,
    });

    expect(response.status()).toBe(200);

    const body = productListSchema.parse(await response.json());
    const titles = body.products.map((product) => product.title);
    // Default Array.sort compares by UTF-16 code units, matching the server.
    expect(titles).toEqual([...titles].sort());
  });

  test('returns only selected fields when using select', async ({
    productsClient,
  }) => {
    const response = await productsClient.list({
      limit: 3,
      select: 'title,price',
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    // Envelope still validates; products carry only id + selected fields.
    paginationEnvelopeSchema.parse(body);
    expect(body.products).toHaveLength(3);
    for (const product of body.products) {
      expect(Object.keys(product).sort()).toEqual(['id', 'price', 'title']);
    }
  });

  test('returns a single product by id', async ({ productsClient }) => {
    const response = await productsClient.getById(1);

    expect(response.status()).toBe(200);

    const product = productSchema.parse(await response.json());
    expect(product.id).toBe(1);
  });

  test('returns 404 for a non-existent product', async ({ productsClient }) => {
    const response = await productsClient.getById(0);

    expect(response.status()).toBe(404);

    const body = errorResponseSchema.parse(await response.json());
    expect(body.message).toMatch(/not found/i);
  });
});
