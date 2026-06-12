import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, string, integer, eachLike, number } = MatchersV3;

/**
 * Products consumer contract — DummyJSON `/products` endpoints.
 *
 * Covers the three interactions the integration suite relies on:
 *   - paginated list (envelope + item shape)
 *   - single product by id
 *   - search by query string
 *
 * `like()` matches structure, not exact values — the contract says "the
 * response will have a field `title` of type string", not "it will equal
 * 'Essence Mascara Lash Princess'". This makes contracts stable across
 * seeded-data changes while still catching structural regressions.
 */

const provider = new PactV3({
  consumer: 'playwright-e2e',
  provider: 'DummyJSON',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'error',
});

const productShape = like({
  id: integer(1),
  title: string('Product'),
  price: number(9.99),
  category: string('category'),
  rating: number(4.5),
  stock: integer(10),
  thumbnail: string('https://cdn.dummyjson.com/thumbnail.webp'),
});

describe('Products contract — GET /products', () => {
  it('returns a pagination envelope with product items', async () => {
    await provider
      .given('products exist')
      .uponReceiving('a request to list products')
      .withRequest({ method: 'GET', path: '/products' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': like('application/json') },
        body: like({
          products: eachLike(productShape),
          total: integer(194),
          skip: integer(0),
          limit: integer(30),
        }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/products`);

        expect(response.status).toBe(200);
        const body = (await response.json()) as {
          products: unknown[];
          total: number;
          skip: number;
          limit: number;
        };
        expect(Array.isArray(body.products)).toBe(true);
        expect(body.products.length).toBeGreaterThan(0);
        expect(typeof body.total).toBe('number');
        expect(typeof body.limit).toBe('number');
        expect(typeof body.skip).toBe('number');
      });
  });
});

describe('Products contract — GET /products/:id', () => {
  it('returns a single product for a valid id', async () => {
    await provider
      .given('product with id 1 exists')
      .uponReceiving('a request for product id 1')
      .withRequest({ method: 'GET', path: '/products/1' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': like('application/json') },
        body: productShape,
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/products/1`);

        expect(response.status).toBe(200);
        const body = (await response.json()) as {
          id: number;
          title: string;
          price: number;
        };
        expect(body.id).toBe(1);
        expect(typeof body.title).toBe('string');
        expect(typeof body.price).toBe('number');
      });
  });

  it('returns 404 for a product id that does not exist', async () => {
    await provider
      .given('product with id 0 does not exist')
      .uponReceiving('a request for non-existent product id 0')
      .withRequest({ method: 'GET', path: '/products/0' })
      .willRespondWith({
        status: 404,
        headers: { 'Content-Type': like('application/json') },
        body: like({ message: string('Product with id') }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/products/0`);

        expect(response.status).toBe(404);
        const body = (await response.json()) as { message: string };
        expect(body.message).toBeTruthy();
      });
  });
});

describe('Products contract — GET /products/search', () => {
  it('returns matching products for a search query', async () => {
    await provider
      .given('products matching "mascara" exist')
      .uponReceiving('a search request for "mascara"')
      .withRequest({
        method: 'GET',
        path: '/products/search',
        query: { q: 'mascara' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': like('application/json') },
        body: like({
          products: eachLike(productShape),
          total: integer(1),
          skip: integer(0),
          limit: integer(30),
        }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/products/search?q=mascara`,
        );

        expect(response.status).toBe(200);
        const body = (await response.json()) as {
          products: unknown[];
          total: number;
        };
        expect(Array.isArray(body.products)).toBe(true);
        expect(body.total).toBeGreaterThan(0);
      });
  });
});
