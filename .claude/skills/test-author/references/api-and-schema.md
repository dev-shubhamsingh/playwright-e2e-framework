# API Tests & the Schema Contract

The workhorse level. Fast, no browser, and it can observe almost everything the UI
can except rendering and routing. When in doubt between a UI spec and an API spec,
the API spec is usually right.

## The core principle

**The response is the whole contract, and it has two halves.** Assert both, every
time:

1. **The status code**, explicitly. Not `response.ok()` — the specific number.
2. **The body, parsed through its zod schema.** The parse _is_ the contract check;
   individual field assertions are the specific claims on top of it.

```ts
const response = await productsClient.getById(0);

expect(response.status()).toBe(404);

const body = errorResponseSchema.parse(await response.json());
expect(body.message).toMatch(/not found/i);
```

Asserting one half without the other is a documented anti-pattern. A `200` carrying
an error payload passes a status-only test; a schema-only test passes when the
endpoint returns the right shape with the wrong code.

`schema.parse()` throws on mismatch, so it is an assertion — you do not need to wrap
it in an `expect`. It also narrows the type, which is why the rest of the test gets
autocomplete on `body`.

## There is no persistence layer

The target is a public demo API. Writes are **simulated**: they echo back what you
sent and are never stored.

| Operation           | Actual behavior                                                             |
| ------------------- | --------------------------------------------------------------------------- |
| `POST /carts/add`   | 201, echoes the cart with computed totals. Nothing persists                 |
| `PUT /carts/:id`    | 200, echoes the merged result                                               |
| `DELETE /carts/:id` | 200, echoes the resource plus `isDeleted: true` and `deletedOn` — not a 204 |
| `POST /users/add`   | Echoes the fields you sent, leaves every other field as an empty string     |

So the usual instruction — "assert the persisted state, not just the response" — is
**not available here**. Do not write a test that re-reads a resource to prove a write
landed; it will fail, and the failure is the target's design, not a defect.

What to assert instead: the response shape, the computed values the server derived
from your input (totals, discounts), and the status code. For `POST /users/add`
specifically, use `createdUserSchema` rather than the full `userSchema` — the echo
response is not a complete user.

Say this plainly in a summary when it matters. "Write coverage is response-shape
only; there is no owned datastore to verify against" is an honest statement about
depth, and hiding it would overstate what the suite protects.

## Layout

```
src/dummyjson/
  clients/     AuthClient, ProductsClient, CartsClient, UsersClient
  schemas/     common, auth, product, cart, user  (barrel: index.ts)
  fixtures/    api.fixture.ts (barrel: index.ts)
  config.ts    DUMMYJSON_BASE_URL, DUMMYJSON_USER — typed view over env

tests/dummyjson/api/
  auth.spec.ts  products.spec.ts  carts.spec.ts  users.spec.ts
```

A new spec here is matched by the `api` project (`**/dummyjson/api/**/*.spec.ts`)
and runs in the gated `test-api` job. Nothing to register.

## Resource clients

Every client extends `@core/http` `ApiClient`. **Never wrap `APIRequestContext`
directly** — you would lose retry/backoff on 429/502/503/504, `Retry-After`
handling, query-param encoding, and the request/response attachment that makes each
call inspectable in the HTML report and trace viewer.

```ts
import { APIResponse } from '@playwright/test';
import { ApiClient, RequestOptions } from '@core/http';

export class ProductsClient extends ApiClient {
  list(params: ListProductsParams = {}): Promise<APIResponse> {
    return this.get('/products', { params: toQuery(params) });
  }

  getById(id: number): Promise<APIResponse> {
    return this.get(`/products/${id}`);
  }

  search(query: string, params: ListProductsParams = {}): Promise<APIResponse> {
    return this.get('/products/search', {
      params: { q: query, ...toQuery(params) },
    });
  }
}
```

Rules:

- **Return the raw `APIResponse`.** The client's job is to encode the endpoint; the
  spec owns status and body assertions. A client that parses and returns a typed
  object steals that from the test and hides the status.
- **A typed params interface per endpoint family**, with a helper that strips
  `undefined` so only the params the caller set reach the wire.
- **Intent-revealing method names.** `search(query)`, not `get('/products/search')`.
- **`protected` verbs.** `get`/`post`/… come from the base class and stay internal to
  the client.

## Schemas

One file per resource plus `common.schema.ts` for shapes every endpoint shares:

| Schema                     | Use                                                                             |
| -------------------------- | ------------------------------------------------------------------------------- |
| `paginationEnvelopeSchema` | `{ total, skip, limit }` — every list and search response                       |
| `errorResponseSchema`      | `{ message }` — every failure                                                   |
| `deletedFlagsSchema`       | Compose via `resourceSchema.extend(deletedFlagsSchema.shape)` for delete echoes |

Rules:

- **A new endpoint gets a schema in the same change.** An endpoint with no schema is
  unvalidated at runtime, which defeats the whole pattern.
- **Export the inferred type** (`export type Product = z.infer<typeof productSchema>`)
  so the schema is the single source of truth for both runtime and compile time.
- **Optional means optional.** Where the target returns a field on `GET` but not on
  `POST` — the cart line item is `discountedTotal` on read and `discountedPrice` on
  write — mark both optional and comment why. Do not force a shape the service does
  not deliver.
- **Making an existing optional field required is a breaking change** to what the
  suite accepts. Call it out rather than slipping it in.
- **Lift a shape into `common.schema.ts`** the second resource that needs it, not the
  third.

## Fixtures and auth

```ts
import { test, expect } from '@dummyjson/fixtures';

test('rejects a request with no token', async ({ authClient }) => { … });

test('returns the current user for a valid token', async ({ authedRequest }) => { … });
```

| Fixture                                                      | Scope      | What it is                                                                                 |
| ------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------ |
| `authClient`, `productsClient`, `cartsClient`, `usersClient` | test       | Anonymous clients on the project's request context                                         |
| `authTokens`                                                 | **worker** | Logs in once per worker, shares `accessToken` / `refreshToken` across that worker's tests  |
| `authedRequest`                                              | test       | An `APIRequestContext` with `Authorization: Bearer …` pre-attached, disposed automatically |

`authTokens` parses the login response through `loginResponseSchema` inside the
fixture. That is deliberate: a drifted auth contract fails fast in setup with a clear
message instead of cascading into every dependent test as an unrelated-looking
failure.

Worker scope, not test scope, because one login per parallel worker is the right cost.
Never log in inside a test.

## Required scenarios

For any endpoint you add or change:

| Scenario              | Required when                                   | Assert                                                                |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Happy path            | Always                                          | Status + full schema parse + the values that matter                   |
| Not found             | The endpoint takes an id                        | The specific status (404) + `errorResponseSchema` + the message shape |
| Validation failure    | The endpoint takes a body or constrained params | The specific status + error shape                                     |
| **Unauthenticated**   | The endpoint requires a token                   | **Mandatory.** Status 401 + error shape                               |
| Pagination boundaries | The endpoint returns a list                     | `limit`, `skip` honoured; `total` consistent with the page            |
| Field selection       | The endpoint supports `select`                  | Only the requested keys plus `id` are present                         |

The unauthenticated negative is not optional and not a nice-to-have. An endpoint
whose only coverage is the happy path is a P0 gap if it is scoped at all — see
[test-levels.md](test-levels.md).

Do **not** test the third party's own behavior. `GET /products` returning products is
their contract; _our_ handling of its envelope, its 404, and its auth rejection is
ours.

## Worked patterns

**Assert an invariant, not seeded data.** The target's dataset drifts:

```ts
// Fragile — breaks when the demo dataset changes
expect(body.total).toBe(194);

// Durable — states the actual invariant
expect(body.products.length).toBeGreaterThan(0);
expect(body.products.length).toBeLessThanOrEqual(body.limit);
expect(body.total).toBeGreaterThan(body.products.length);
```

**Match the server's own semantics.** The list endpoint's ascending sort compares
UTF-16 code units, which is exactly what `Array.prototype.sort` does by default:

```ts
const titles = body.products.map((p) => p.title);
expect(titles).toEqual([...titles].sort());
```

Using `localeCompare` here would fail against a correctly-sorted response. When an
assertion has to mirror a server implementation detail, comment why.

**Parse the envelope even when items are partial.** With `select`, items carry only
the chosen fields, so parse the envelope and assert the item keys:

```ts
paginationEnvelopeSchema.parse(body);
for (const product of body.products) {
  expect(Object.keys(product).sort()).toEqual(['id', 'price', 'title']);
}
```

## Verify

```bash
npx playwright test tests/dummyjson/api/products.spec.ts --project=api
npm run test:api                    # the whole API project
npm run typecheck && npm run lint
```

The API suite needs network reach to the live target. If a run fails wholesale,
check the target is up before diagnosing a code defect — see [ci-gates.md](ci-gates.md).

## Checklist

- [ ] The client extends `ApiClient` and returns the raw `APIResponse`.
- [ ] A zod schema exists for every new response shape, with its inferred type
      exported.
- [ ] Every test asserts the status **and** parses the body.
- [ ] The unauthenticated negative exists if the endpoint is scoped.
- [ ] Auth comes from `authTokens` / `authedRequest`, never an inline login.
- [ ] Assertions state invariants, not values from today's demo dataset.
- [ ] No `process.env` — config through `@dummyjson/config` → `@core/config/env`.
- [ ] Spec is under `tests/dummyjson/api/` so the `api` project matches it.
- [ ] `typecheck`, `lint`, `format:check` clean.
