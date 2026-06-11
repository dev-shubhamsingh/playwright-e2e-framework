import { APIRequestContext } from '@playwright/test';

/**
 * Base class for all API resource clients (AuthClient, ProductsClient, ...).
 *
 * Each client extends this and receives an injected `APIRequestContext`. The
 * context already carries the `baseURL` and, when authenticated, the bearer
 * token (via `extraHTTPHeaders`), so clients issue clean relative requests such
 * as `this.request.post('/auth/login')`.
 *
 * Keeping a thin shared base gives one consistent construction contract and a
 * single place to add cross-cutting concerns later (request logging, retry on
 * 429, response-time capture) without editing every client.
 *
 * Clients return the raw `APIResponse` rather than pre-parsed bodies, so tests
 * own their assertions on status, headers, and body.
 */
export abstract class BaseClient {
  constructor(protected readonly request: APIRequestContext) {}
}
