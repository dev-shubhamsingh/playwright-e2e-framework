import * as dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Typed, validated environment configuration.
 *
 * All environment access funnels through here so that:
 *   - every value has one documented default and one declared type,
 *   - misconfiguration fails fast at startup with a readable message rather
 *     than surfacing as a confusing runtime error deep inside a test,
 *   - the rest of the codebase imports a typed `env` object instead of reaching
 *     into `process.env` with string defaults scattered everywhere.
 *
 * Defaults target the public demo services so the suite runs with zero setup;
 * every value is overridable via a real environment variable or `.env`.
 */
dotenv.config();

const envSchema = z.object({
  // SauceDemo UI module
  BASE_URL: z.string().url().default('https://www.saucedemo.com'),
  TEST_USER: z.string().min(1).default('standard_user'),
  TEST_PASSWORD: z.string().min(1).default('secret_sauce'),

  // DummyJSON API module
  API_BASE_URL: z.string().url().default('https://dummyjson.com'),
  DUMMYJSON_USERNAME: z.string().min(1).default('emilys'),
  DUMMYJSON_PASSWORD: z.string().min(1).default('emilyspass'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
