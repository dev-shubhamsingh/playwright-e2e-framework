# DummyJSON API Module

End-to-end API integration tests for [DummyJSON](https://dummyjson.com),
built with Playwright's `APIRequestContext`. This module mirrors the structure
of the SauceDemo UI module so conventions, tooling, and config carry over.

## Why DummyJSON

- **Stable and free** — no signup, no personal token, no aggressive rate limits,
  so the suite stays green in CI over the long term.
- **Broad surface area** — auth (JWT access + refresh tokens), CRUD, pagination,
  search, sorting, and realistic error responses.
- **No browser required** — tests run against the HTTP API directly, fast and
  fully parallel alongside the UI suite.

Note: DummyJSON simulates write operations (add/update/delete return realistic
responses but do not persist). Tests assert on the response contract rather than
re-fetching to confirm persistence, and call this out where relevant.

## Structure

```
src/dummyjson/
├── clients/         # one client class per resource (the API equivalent of a Page Object)
│   ├── AuthClient.ts
│   └── ProductsClient.ts
├── fixtures/        # api.fixture.ts (clients + authenticated request context) + barrel
├── schemas/         # zod response contracts (also serve as TypeScript types)
├── config.ts        # base URL + seeded user, all env-overridable
└── README.md
tests/dummyjson/
└── api/             # spec files
    ├── auth.spec.ts
    └── products.spec.ts
```

Path alias: `@dummyjson/*` → `src/dummyjson/*`. Clients extend the shared
`@core/http` `ApiClient`.

## Clients

Each resource gets a client extending the shared `@core/http` `ApiClient`, which
holds an injected `APIRequestContext` and adds cross-cutting behaviour: typed
`get/post/...` helpers, automatic retry with backoff on transient statuses
(429/503/...), and request/response capture as a report attachment. Clients
issue relative requests (the base URL lives on the context) and return the raw
`APIResponse`, so specs assert on status, headers, and body themselves.

## Fixtures

Import from `@dummyjson/fixtures`:

| Fixture          | Scope  | Purpose                                                            |
| ---------------- | ------ | ------------------------------------------------------------------ |
| `authClient`     | test   | Anonymous `AuthClient` for driving `/auth/*` directly.             |
| `productsClient` | test   | Anonymous `ProductsClient` for the public `/products` endpoints.   |
| `authTokens`     | worker | Logs in once per worker; shares access/refresh tokens.             |
| `authedRequest`  | test   | Request context with `Authorization: Bearer <token>` pre-attached. |

The login response is validated against its schema inside the `authTokens`
fixture, so a broken auth contract fails fast before dependent tests run.

## Schema validation

Response shapes are validated with [zod](https://zod.dev). A schema is the
single source of truth for both the runtime check and the TypeScript type
(`z.infer`), so the contract and the type cannot drift apart. This is the
consumer-side shape check; cross-team contract testing (Pact) is planned
separately.

## Configuration

Defaults run out of the box. Override via environment variables (see
`.env.example`):

| Variable             | Default                 | Purpose                |
| -------------------- | ----------------------- | ---------------------- |
| `API_BASE_URL`       | `https://dummyjson.com` | API base URL.          |
| `DUMMYJSON_USERNAME` | `emilys`                | Seeded login user.     |
| `DUMMYJSON_PASSWORD` | `emilyspass`            | Seeded login password. |

## Running

```bash
# API suite only
npx playwright test --project=api

# A single spec
npx playwright test tests/dummyjson/api/auth.spec.ts
```

## Coverage

| Area     | Scenarios                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------- |
| Auth     | login happy path, invalid credentials (400), `/auth/me` with token, `/auth/me` without token (401) |
| Products | list envelope, pagination (limit/skip), search, sort, field select, single by id, 404 not-found    |

```

```
