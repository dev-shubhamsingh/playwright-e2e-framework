import { APIResponse } from '@playwright/test';
import { ApiClient, RequestOptions } from '@core/http';

/** Query parameters supported by the user list endpoint. */
export interface ListUsersParams {
  limit?: number;
  skip?: number;
  /** Comma-separated field list, e.g. 'firstName,age'. */
  select?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Partial user payload for create/update. DummyJSON accepts any subset of user
 * fields; only the ones sent are echoed back.
 */
export interface UserInput {
  firstName?: string;
  lastName?: string;
  age?: number;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

/**
 * UsersClient — wraps the DummyJSON `/users` endpoints.
 *
 *   GET    /users           → paginated list
 *   GET    /users/:id       → single user (404 if absent)
 *   GET    /users/search?q= → search by query
 *   POST   /users/add       → create a user (simulated, not persisted)
 *   PUT    /users/:id       → update a user (simulated)
 *   DELETE /users/:id       → delete a user (simulated; echoes isDeleted)
 *
 * The read endpoints are public. Writes are simulated server-side, so specs
 * assert on the returned contract rather than a re-fetch.
 */
export class UsersClient extends ApiClient {
  /** List users with optional pagination, field selection, and sorting. */
  list(params: ListUsersParams = {}): Promise<APIResponse> {
    return this.get('/users', { params: toQuery(params) });
  }

  /** Fetch a single user by id. Returns 404 when it does not exist. */
  getById(id: number): Promise<APIResponse> {
    return this.get(`/users/${id}`);
  }

  /** Search users by free-text query. */
  search(query: string): Promise<APIResponse> {
    return this.get('/users/search', { params: { q: query } });
  }

  /** Create a user. Echoes the submitted fields with a new id. */
  add(user: UserInput): Promise<APIResponse> {
    return this.post('/users/add', { data: user });
  }

  /** Update a user. Echoes the merged user back. */
  update(id: number, changes: UserInput): Promise<APIResponse> {
    return this.put(`/users/${id}`, { data: changes });
  }

  /** Delete a user. Echoes the user back with `isDeleted: true`. */
  remove(id: number): Promise<APIResponse> {
    return this.delete(`/users/${id}`);
  }
}

/** Drop undefined values so only the params the caller set hit the wire. */
function toQuery(params: ListUsersParams): RequestOptions['params'] {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as RequestOptions['params'];
}
