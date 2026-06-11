import { test, expect } from '@dummyjson/fixtures';
import { DUMMYJSON_USER } from '@dummyjson/config';
import {
  authUserSchema,
  errorResponseSchema,
  loginResponseSchema,
} from '@dummyjson/schemas';

/**
 * Auth endpoint integration tests against DummyJSON.
 *
 * Covers the login happy path, an invalid-credentials negative case, and the
 * /auth/me endpoint both with and without a token. Response shapes are
 * validated against zod schemas in addition to status-code and value checks.
 */
test.describe('Auth API', () => {
  test('logs in with valid credentials and returns tokens', async ({
    authClient,
  }) => {
    const response = await authClient.login(DUMMYJSON_USER);

    expect(response.status()).toBe(200);

    const body = loginResponseSchema.parse(await response.json());
    expect(body.username).toBe(DUMMYJSON_USER.username);
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(body.refreshToken.length).toBeGreaterThan(0);
  });

  test('rejects invalid credentials with 400', async ({ authClient }) => {
    const response = await authClient.login({
      username: 'not-a-real-user',
      password: 'wrong-password',
    });

    expect(response.status()).toBe(400);

    const body = errorResponseSchema.parse(await response.json());
    expect(body.message).toMatch(/invalid credentials/i);
  });

  test('returns the current user for a valid access token', async ({
    authClient,
    authTokens,
  }) => {
    const response = await authClient.me(authTokens.accessToken);

    expect(response.status()).toBe(200);

    const body = authUserSchema.parse(await response.json());
    expect(body.username).toBe(DUMMYJSON_USER.username);
  });

  test('rejects /auth/me without a token with 401', async ({ authClient }) => {
    const response = await authClient.me();

    expect(response.status()).toBe(401);

    const body = errorResponseSchema.parse(await response.json());
    expect(body.message.length).toBeGreaterThan(0);
  });
});
