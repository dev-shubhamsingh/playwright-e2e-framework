import { test as base, APIRequestContext } from '@playwright/test';
import { AuthClient } from '../clients/AuthClient';
import { DUMMYJSON_BASE_URL, DUMMYJSON_USER } from '../config';
import { loginResponseSchema } from '../schemas';

/**
 * Tokens obtained once per worker and shared across that worker's tests.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Worker-scoped fixtures: created once per parallel worker, reused per test. */
type ApiWorkerFixtures = {
  authTokens: AuthTokens;
};

/** Test-scoped fixtures: a fresh instance per test. */
type ApiTestFixtures = {
  authClient: AuthClient;
  authedRequest: APIRequestContext;
};

/**
 * API test harness for the DummyJSON module.
 *
 * Fixtures:
 *   authClient    — anonymous AuthClient bound to the project's request context.
 *                   Use it to drive /auth/* directly (login, bad creds, etc.).
 *   authTokens    — worker-scoped. Logs in once per worker and shares the same
 *                   access/refresh tokens with every test in that worker,
 *                   avoiding a redundant login per test.
 *   authedRequest — a request context with `Authorization: Bearer <token>`
 *                   pre-attached, for authenticated calls. Resource clients
 *                   (Products, Carts, ...) will be built on top of this.
 *
 * A bearer token in a header is simpler and faster than persisting browser
 * session state, so this module uses a login fixture rather than the
 * storageState/setup-project approach the UI module uses. The login response is
 * validated against its schema here, so a broken contract fails fast before any
 * dependent test runs.
 */
export const test = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  authTokens: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({
        baseURL: DUMMYJSON_BASE_URL,
      });

      const auth = new AuthClient(ctx);
      const response = await auth.login(DUMMYJSON_USER);

      if (!response.ok()) {
        throw new Error(
          `Auth fixture login failed: ${response.status()} ${await response.text()}`,
        );
      }

      // Fail fast if the login contract drifted — every dependent test would
      // otherwise fail with confusing downstream errors.
      const body = loginResponseSchema.parse(await response.json());

      await use({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });

      await ctx.dispose();
    },
    { scope: 'worker' },
  ],

  authClient: async ({ request }, use) => {
    await use(new AuthClient(request));
  },

  authedRequest: async ({ playwright, authTokens }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: DUMMYJSON_BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${authTokens.accessToken}`,
      },
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect } from '@playwright/test';
