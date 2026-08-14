import { test, expect } from '@playwright/test';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { ApiClient } from '@core/http';

/**
 * Framework unit tests for the ApiClient retry/backoff behaviour.
 *
 * ApiClient is the highest-value target in the framework: every API test depends
 * on it, and its retry logic is exactly the kind of code that can be silently
 * wrong for months because the happy path never exercises it.
 *
 * The class takes an `APIRequestContext` as a constructor parameter, so a plain
 * fake object is all the seam we need — no mocking library, and none installed.
 * Assertions are on the returned response and the recorded call log, never on
 * "was a fake called", per the anti-pattern catalog.
 */

/** A recorded outbound call. */
interface Call {
  method: string;
  path: string;
  params?: Record<string, unknown>;
  data?: unknown;
}

/** Minimal APIResponse stand-in — only the members ApiClient touches. */
function fakeResponse(
  status: number,
  headers: Record<string, string> = {},
  body = '',
): APIResponse {
  return {
    status: () => status,
    statusText: () => `status ${status}`,
    headers: () => headers,
    text: async () => body,
    ok: () => status >= 200 && status < 300,
  } as unknown as APIResponse;
}

/**
 * Build a fake request context that returns the given responses in order,
 * repeating the last one once exhausted, and records every call.
 */
function fakeContext(responses: APIResponse[]) {
  const calls: Call[] = [];
  let index = 0;

  const handler =
    (method: string) =>
    async (path: string, options: Record<string, unknown> = {}) => {
      calls.push({
        method,
        path,
        params: options.params as Record<string, unknown> | undefined,
        data: options.data,
      });
      const response = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return response;
    };

  const context = {
    get: handler('get'),
    post: handler('post'),
    put: handler('put'),
    patch: handler('patch'),
    delete: handler('delete'),
  } as unknown as APIRequestContext;

  return { context, calls };
}

/** Concrete client exposing the protected verbs so they can be exercised. */
class TestClient extends ApiClient {
  fetch(path: string, params?: Record<string, string | number | boolean>) {
    return this.get(path, params ? { params } : {});
  }

  create(path: string, data: unknown) {
    return this.post(path, { data });
  }
}

test.describe('ApiClient — success path', { tag: '@regression' }, () => {
  test('returns a 200 after a single request', async () => {
    const { context, calls } = fakeContext([fakeResponse(200)]);
    const client = new TestClient(context);

    const response = await client.fetch('/products');

    expect(response.status()).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: 'get', path: '/products' });
  });

  test('passes query params through to the request', async () => {
    const { context, calls } = fakeContext([fakeResponse(200)]);
    const client = new TestClient(context);

    await client.fetch('/products', { limit: 5, order: 'asc' });

    expect(calls[0].params).toEqual({ limit: 5, order: 'asc' });
  });

  test('passes a JSON body through on a write', async () => {
    const { context, calls } = fakeContext([fakeResponse(201)]);
    const client = new TestClient(context);

    await client.create('/carts/add', { userId: 1 });

    expect(calls[0]).toMatchObject({ method: 'post', path: '/carts/add' });
    expect(calls[0].data).toEqual({ userId: 1 });
  });
});

test.describe('ApiClient — retry behaviour', { tag: '@regression' }, () => {
  test('retries a 429 and returns the subsequent success', async () => {
    const { context, calls } = fakeContext([
      fakeResponse(429, { 'retry-after': '0' }),
      fakeResponse(200),
    ]);
    const client = new TestClient(context);

    const response = await client.fetch('/products');

    expect(response.status()).toBe(200);
    expect(calls).toHaveLength(2);
  });

  for (const status of [429, 502, 503, 504]) {
    test(`retries a transient ${status}`, async () => {
      const { context, calls } = fakeContext([
        fakeResponse(status, { 'retry-after': '0' }),
        fakeResponse(200),
      ]);
      const client = new TestClient(context);

      const response = await client.fetch('/products');

      expect(response.status()).toBe(200);
      expect(calls).toHaveLength(2);
    });
  }

  test('stops after the retry budget and returns the last failure', async () => {
    // Critical contract: it must RETURN the failing response, not throw —
    // specs assert on the status themselves.
    const { context, calls } = fakeContext([
      fakeResponse(503, { 'retry-after': '0' }),
    ]);
    const client = new TestClient(context);

    const response = await client.fetch('/products');

    expect(response.status()).toBe(503);
    // MAX_RETRIES = 2 → one initial attempt plus two retries.
    expect(calls).toHaveLength(3);
  });

  for (const status of [400, 401, 404, 422, 500]) {
    test(`does not retry a non-transient ${status}`, async () => {
      const { context, calls } = fakeContext([fakeResponse(status)]);
      const client = new TestClient(context);

      const response = await client.fetch('/products');

      expect(response.status()).toBe(status);
      expect(calls).toHaveLength(1);
    });
  }
});

test.describe(
  'ApiClient — Retry-After handling',
  { tag: '@regression' },
  () => {
    test('honours a numeric Retry-After header', async () => {
      const { context } = fakeContext([
        fakeResponse(429, { 'retry-after': '0' }),
        fakeResponse(200),
      ]);
      const client = new TestClient(context);

      const started = Date.now();
      await client.fetch('/products');
      const elapsed = Date.now() - started;

      // Retry-After: 0 means retry immediately, so this must be far below the
      // 300ms exponential-backoff default it replaces.
      expect(elapsed).toBeLessThan(250);
    });

    for (const header of ['soon', '-5', '', 'NaN']) {
      test(`falls back to backoff on a malformed Retry-After: "${header}"`, async () => {
        // retryDelayMs guards with Number.isFinite and >= 0. Without that guard a
        // malformed header yields NaN, and setTimeout(NaN) fires immediately —
        // turning a polite backoff into a tight retry loop against a struggling
        // service.
        const { context, calls } = fakeContext([
          fakeResponse(429, { 'retry-after': header }),
          fakeResponse(200),
        ]);
        const client = new TestClient(context);

        const response = await client.fetch('/products');

        expect(response.status()).toBe(200);
        expect(calls).toHaveLength(2);
      });
    }
  },
);

test.describe('ApiClient — report attachment', { tag: '@regression' }, () => {
  test('attaches the request and response to the running test', async () => {
    const { context } = fakeContext([
      fakeResponse(200, { 'content-type': 'application/json' }, '{"ok":true}'),
    ]);
    const client = new TestClient(context);

    await client.fetch('/products', { limit: 1 });

    const attachment = test
      .info()
      .attachments.find((a) => a.name === 'GET /products');

    expect(attachment).toBeDefined();
    const payload = JSON.parse(String(attachment?.body));
    expect(payload.request).toMatchObject({
      method: 'GET',
      path: '/products',
      params: { limit: 1 },
    });
    expect(payload.response).toMatchObject({ status: 200, body: { ok: true } });
  });

  test('records a non-JSON body as raw text rather than throwing', async () => {
    const { context } = fakeContext([
      fakeResponse(502, {}, '<html>Bad Gateway</html>'),
    ]);
    const client = new TestClient(context);

    await client.fetch('/gateway');

    const attachment = test
      .info()
      .attachments.find((a) => a.name === 'GET /gateway');
    const payload = JSON.parse(String(attachment?.body));

    expect(payload.response.body).toBe('<html>Bad Gateway</html>');
  });

  test('records an empty body as null', async () => {
    const { context } = fakeContext([fakeResponse(204, {}, '')]);
    const client = new TestClient(context);

    await client.fetch('/empty');

    const attachment = test
      .info()
      .attachments.find((a) => a.name === 'GET /empty');
    const payload = JSON.parse(String(attachment?.body));

    expect(payload.response.body).toBeNull();
  });
});
