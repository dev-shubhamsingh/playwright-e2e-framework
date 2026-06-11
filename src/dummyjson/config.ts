import { env } from '@core/config/env';

/**
 * DummyJSON module configuration.
 *
 * Thin, domain-specific view over the validated core `env`. Centralising the
 * raw environment parsing in `@core/config/env` means this module just maps the
 * relevant, already-typed values into the shapes the API clients expect.
 */

export const DUMMYJSON_BASE_URL = env.API_BASE_URL;

/** A valid seeded DummyJSON user. Defaults to the public `emilys` account. */
export const DUMMYJSON_USER = {
  username: env.DUMMYJSON_USERNAME,
  password: env.DUMMYJSON_PASSWORD,
} as const;

export type DummyJsonUser = typeof DUMMYJSON_USER;
