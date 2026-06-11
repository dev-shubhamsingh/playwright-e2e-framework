/**
 * DummyJSON module configuration.
 *
 * Single source of truth for the API base URL and the seeded test user.
 * Defaults target the public DummyJSON instance and a documented seeded user,
 * so the suite runs without any setup. Every value is overridable via
 * environment variables to point the same tests at a self-hosted instance or a
 * different account in CI.
 *
 * Credentials are read from the environment (see `.env.example`) rather than
 * hard-coded in specs.
 */

export const DUMMYJSON_BASE_URL =
  process.env.API_BASE_URL ?? 'https://dummyjson.com';

/**
 * A valid seeded DummyJSON user. `emilys` / `emilyspass` is documented and
 * stable. Override via env for CI or to exercise a different account.
 */
export const DUMMYJSON_USER = {
  username: process.env.DUMMYJSON_USERNAME ?? 'emilys',
  password: process.env.DUMMYJSON_PASSWORD ?? 'emilyspass',
} as const;

export type DummyJsonUser = typeof DUMMYJSON_USER;
