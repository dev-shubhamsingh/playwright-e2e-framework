import { APIResponse } from '@playwright/test';
import { ApiClient, RequestOptions } from '@core/http';

/** Query parameters supported by the product list/search endpoints. */
export interface ListProductsParams {
  limit?: number;
  skip?: number;
  /** Comma-separated field list, e.g. 'title,price'. */
  select?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * ProductsClient — wraps the DummyJSON `/products` endpoints.
 *
 *   GET /products                 → paginated list
 *   GET /products/:id             → single product (404 if absent)
 *   GET /products/search?q=...    → search by query
 *
 * The products endpoints are public, so this client works on an anonymous
 * request context.
 */
export class ProductsClient extends ApiClient {
  /** List products with optional pagination, field selection, and sorting. */
  list(params: ListProductsParams = {}): Promise<APIResponse> {
    return this.get('/products', { params: toQuery(params) });
  }

  /** Fetch a single product by id. Returns 404 when it does not exist. */
  getById(id: number): Promise<APIResponse> {
    return this.get(`/products/${id}`);
  }

  /** Search products by free-text query, with the same list params available. */
  search(query: string, params: ListProductsParams = {}): Promise<APIResponse> {
    return this.get('/products/search', {
      params: { q: query, ...toQuery(params) },
    });
  }
}

/** Drop undefined values so only the params the caller set hit the wire. */
function toQuery(params: ListProductsParams): RequestOptions['params'] {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as RequestOptions['params'];
}
