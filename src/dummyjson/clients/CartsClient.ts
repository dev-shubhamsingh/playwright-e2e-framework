import { APIResponse } from '@playwright/test';
import { ApiClient } from '@core/http';

/** Pagination params for the cart list endpoint. */
export interface ListCartsParams {
  limit?: number;
  skip?: number;
}

/** A single line item in an add/update-cart request. */
export interface CartItemInput {
  id: number;
  quantity: number;
}

/** Body for creating a cart. */
export interface AddCartInput {
  userId: number;
  products: CartItemInput[];
}

/**
 * CartsClient — wraps the DummyJSON `/carts` endpoints.
 *
 *   GET    /carts              → paginated list
 *   GET    /carts/:id          → single cart (404 if absent)
 *   GET    /carts/user/:userId → carts belonging to a user
 *   POST   /carts/add          → create a cart (simulated, not persisted)
 *   PUT    /carts/:id          → update a cart (simulated)
 *   DELETE /carts/:id          → delete a cart (simulated; echoes isDeleted)
 *
 * Writes are simulated server-side: the response reflects the change but
 * nothing persists, so specs assert on the returned contract, not a re-fetch.
 */
export class CartsClient extends ApiClient {
  /** List carts with optional pagination. */
  list(params: ListCartsParams = {}): Promise<APIResponse> {
    return this.get('/carts', { params: { ...params } });
  }

  /** Fetch a single cart by id. Returns 404 when it does not exist. */
  getById(id: number): Promise<APIResponse> {
    return this.get(`/carts/${id}`);
  }

  /** Fetch the carts belonging to a given user. */
  getByUser(userId: number): Promise<APIResponse> {
    return this.get(`/carts/user/${userId}`);
  }

  /** Create a cart for a user from a list of product/quantity pairs. */
  add(input: AddCartInput): Promise<APIResponse> {
    return this.post('/carts/add', { data: input });
  }

  /**
   * Update a cart. Pass `merge: true` to add to the existing cart rather than
   * replace its products.
   */
  update(
    id: number,
    products: CartItemInput[],
    merge = true,
  ): Promise<APIResponse> {
    return this.put(`/carts/${id}`, { data: { merge, products } });
  }

  /** Delete a cart. Echoes the cart back with `isDeleted: true`. */
  remove(id: number): Promise<APIResponse> {
    return this.delete(`/carts/${id}`);
  }
}
