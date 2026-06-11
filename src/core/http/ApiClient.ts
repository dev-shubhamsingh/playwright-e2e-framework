import { APIRequestContext, APIResponse, test } from '@playwright/test';

/**
 * Options accepted by every request helper. `params` are appended as the query
 * string; `data` is JSON-encoded as the request body.
 */
export interface RequestOptions {
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  headers?: Record<string, string>;
}

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** HTTP statuses worth retrying — transient rate-limit / gateway errors. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 300;

/**
 * Base class for all API resource clients.
 *
 * Wraps a Playwright `APIRequestContext` (which carries the baseURL and, when
 * authenticated, the bearer header) and adds the cross-cutting behaviour we want
 * on every call:
 *
 *   - typed `get/post/put/patch/delete` helpers with query-param support,
 *   - automatic retry with backoff on transient statuses (429/503/...),
 *     honouring a `Retry-After` header when present,
 *   - request/response captured as an attachment on the active test, so each
 *     call is inspectable in the HTML report and trace viewer.
 *
 * Resource clients extend this and expose intent-revealing methods; specs still
 * receive the raw `APIResponse` so they own status/body assertions.
 */
export abstract class ApiClient {
  constructor(protected readonly request: APIRequestContext) {}

  protected get(
    path: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    return this.send('get', path, options);
  }

  protected post(
    path: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    return this.send('post', path, options);
  }

  protected put(
    path: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    return this.send('put', path, options);
  }

  protected patch(
    path: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    return this.send('patch', path, options);
  }

  protected delete(
    path: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    return this.send('delete', path, options);
  }

  private async send(
    method: HttpMethod,
    path: string,
    options: RequestOptions,
  ): Promise<APIResponse> {
    let response!: APIResponse;

    for (let attempt = 0; ; attempt++) {
      response = await this.request[method](path, {
        params: options.params,
        data: options.data,
        headers: options.headers,
      });

      if (
        !RETRYABLE_STATUSES.has(response.status()) ||
        attempt >= MAX_RETRIES
      ) {
        break;
      }
      await sleep(retryDelayMs(response, attempt));
    }

    await this.attachToReport(method, path, options, response);
    return response;
  }

  /**
   * Attach the request and response to the active test for report/trace
   * visibility. No-op when called outside a running test (e.g. a worker-scoped
   * setup fixture), so it never throws.
   */
  private async attachToReport(
    method: HttpMethod,
    path: string,
    options: RequestOptions,
    response: APIResponse,
  ): Promise<void> {
    let info: ReturnType<typeof test.info>;
    try {
      info = test.info();
    } catch {
      return; // not inside a test — nothing to attach to
    }

    const payload = {
      request: {
        method: method.toUpperCase(),
        path,
        params: options.params,
        body: options.data,
      },
      response: {
        status: response.status(),
        statusText: response.statusText(),
        body: await safeBody(response),
      },
    };

    await info.attach(`${method.toUpperCase()} ${path}`, {
      body: JSON.stringify(payload, null, 2),
      contentType: 'application/json',
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Prefer the server's `Retry-After` (seconds); fall back to exponential backoff. */
function retryDelayMs(response: APIResponse, attempt: number): number {
  const retryAfter = response.headers()['retry-after'];
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  return BASE_BACKOFF_MS * 2 ** attempt;
}

/** Read a response body for logging without throwing on non-JSON/empty bodies. */
async function safeBody(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
