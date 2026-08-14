import { test, expect } from '@playwright/test';
import { z } from 'zod';
import { envSchema, formatEnvIssues } from '@core/config/env';

/**
 * Framework unit tests for the environment contract.
 *
 * The schema is exercised directly on explicit objects rather than by mutating
 * `process.env` and re-importing the module — that approach is order-dependent
 * and leaks state between tests. Testing `envSchema` tests the rules; the
 * exported `env` singleton is just those rules applied to `process.env` once.
 */

/**
 * Parse an input expected to be invalid and return its error.
 *
 * The narrowing lives here, at module scope, rather than as an `if` inside a
 * test — Playwright's `no-conditional-in-test` rule is right that branching in a
 * test body obscures what is being asserted, even when the branch is only for
 * the type checker.
 */
function expectInvalid(input: Record<string, unknown>): z.ZodError {
  const result = envSchema.safeParse(input);
  if (result.success) {
    throw new Error(
      `Expected the schema to reject ${JSON.stringify(input)}, but it parsed successfully.`,
    );
  }
  return result.error;
}

test.describe('envSchema — defaults', { tag: '@regression' }, () => {
  test('applies every default when nothing is set', () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      BASE_URL: 'https://www.saucedemo.com',
      TEST_USER: 'standard_user',
      TEST_PASSWORD: 'secret_sauce',
      API_BASE_URL: 'https://dummyjson.com',
      DUMMYJSON_USERNAME: 'emilys',
      DUMMYJSON_PASSWORD: 'emilyspass',
    });
  });

  test('a provided value overrides its default', () => {
    const result = envSchema.safeParse({
      BASE_URL: 'https://staging.example.com',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.BASE_URL).toBe(
      'https://staging.example.com',
    );
    // Untouched keys still fall back.
    expect(result.success && result.data.TEST_USER).toBe('standard_user');
  });

  test('ignores unrelated environment variables', () => {
    // process.env carries hundreds of unrelated keys; the schema must not choke.
    const result = envSchema.safeParse({ PATH: '/usr/bin', HOME: '/root' });

    expect(result.success).toBe(true);
  });
});

test.describe('envSchema — validation', { tag: '@regression' }, () => {
  test('rejects a BASE_URL that is not a URL', () => {
    expect(expectInvalid({ BASE_URL: 'not-a-url' }).issues[0].path).toEqual([
      'BASE_URL',
    ]);
  });

  test('rejects an empty TEST_USER', () => {
    const result = envSchema.safeParse({ TEST_USER: '' });

    expect(result.success).toBe(false);
  });

  test('rejects an empty TEST_PASSWORD', () => {
    const result = envSchema.safeParse({ TEST_PASSWORD: '' });

    expect(result.success).toBe(false);
  });

  test('rejects an API_BASE_URL that is not a URL', () => {
    const result = envSchema.safeParse({ API_BASE_URL: 'dummyjson.com' });

    expect(result.success).toBe(false);
  });
});

test.describe('formatEnvIssues', { tag: '@regression' }, () => {
  test('lists every invalid field, not just the first', () => {
    // The point of fail-fast config is one run surfacing all misconfiguration.
    // Reporting only the first issue means a three-variable mistake takes three
    // runs to diagnose.
    const message = formatEnvIssues(
      expectInvalid({
        BASE_URL: 'nope',
        API_BASE_URL: 'also-nope',
        TEST_USER: '',
      }),
    );

    expect(message).toContain('BASE_URL');
    expect(message).toContain('API_BASE_URL');
    expect(message).toContain('TEST_USER');
    expect(message.split('\n')).toHaveLength(3);
  });

  test('formats each issue as an indented, named bullet', () => {
    expect(formatEnvIssues(expectInvalid({ BASE_URL: 'nope' }))).toMatch(
      /^ {2}- BASE_URL: .+/,
    );
  });
});
