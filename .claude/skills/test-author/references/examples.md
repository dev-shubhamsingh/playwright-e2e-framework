# Worked Examples

Every example below is drawn from code that exists in this repository. Read the real
file before copying — a neighbouring spec is the strongest signal for local convention,
and these excerpts are abridged.

| #   | Level                            | Source                                      |
| --- | -------------------------------- | ------------------------------------------- |
| 1   | API — happy path + invariants    | `tests/dummyjson/api/products.spec.ts`      |
| 2   | API — negative                   | same                                        |
| 3   | API — resource client            | `src/dummyjson/clients/ProductsClient.ts`   |
| 4   | API — worker-scoped auth fixture | `src/dummyjson/fixtures/api.fixture.ts`     |
| 5   | UI E2E                           | `tests/saucedemo/e2e/cart.spec.ts`          |
| 6   | UI — page object                 | `src/saucedemo/pages/LoginPage.ts`          |
| 7   | UI — auth setup project          | `tests/saucedemo/auth.setup.ts`             |
| 8   | Accessibility                    | `tests/saucedemo/a11y/a11y.spec.ts`         |
| 9   | Visual                           | `tests/saucedemo/visual/visual.spec.ts`     |
| 10  | Contract                         | `tests/dummyjson/contract/products.pact.ts` |
| 11  | Performance                      | `tests/dummyjson/performance/lib/config.ts` |
| 12  | The regression test              | pattern, cross-cutting                      |

---

## 1. API — happy path asserting invariants

```ts
import { test, expect } from '@dummyjson/fixtures';
import { productListSchema } from '@dummyjson/schemas';

test.describe('Products API', { tag: '@regression' }, () => {
  test(
    'lists products with a valid pagination envelope',
    { tag: '@smoke' },
    async ({ productsClient }) => {
      const response = await productsClient.list();

      expect(response.status()).toBe(200);

      const body = productListSchema.parse(await response.json());
      expect(body.products.length).toBeGreaterThan(0);
      expect(body.products.length).toBeLessThanOrEqual(body.limit);
      expect(body.total).toBeGreaterThan(body.products.length);
    },
  );
});
```

Why it is built this way:

- Status asserted explicitly, then the body parsed through its schema. Both halves.
- The assertions are **invariants**, not values. `total` is never pinned to a number,
  because the demo dataset changes and a pinned count would fail for no real reason.
- `@smoke` on exactly one test per area; `@regression` on the `describe`.
- The client comes from the fixture. No `new ProductsClient(...)` in the spec.

## 2. API — the negative

```ts
test('returns 404 for a non-existent product', async ({ productsClient }) => {
  const response = await productsClient.getById(0);

  expect(response.status()).toBe(404);

  const body = errorResponseSchema.parse(await response.json());
  expect(body.message).toMatch(/not found/i);
});
```

The message is asserted with a **regex**, not an equality check. The target owns the
exact wording (`"Product with id '0' not found"`); pinning it makes the test break on a
harmless copy edit while adding nothing. The shape and the substance are what matter.

## 3. API — a resource client

```ts
import { APIResponse } from '@playwright/test';
import { ApiClient, RequestOptions } from '@core/http';

export interface ListProductsParams {
  limit?: number;
  skip?: number;
  select?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export class ProductsClient extends ApiClient {
  list(params: ListProductsParams = {}): Promise<APIResponse> {
    return this.get('/products', { params: toQuery(params) });
  }

  getById(id: number): Promise<APIResponse> {
    return this.get(`/products/${id}`);
  }
}

/** Drop undefined values so only the params the caller set hit the wire. */
function toQuery(params: ListProductsParams): RequestOptions['params'] {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as RequestOptions['params'];
}
```

- Extends `ApiClient`, so retry/backoff, `Retry-After` handling, and report attachment
  come for free.
- Returns the raw `APIResponse`. The spec owns the assertions.
- A typed params interface, and a helper stripping `undefined` — without it, an unset
  `limit` would serialise as `limit=undefined`.

## 4. API — worker-scoped auth

```ts
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

      // Fail fast if the login contract drifted.
      const body = loginResponseSchema.parse(await response.json());

      await use({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });

      await ctx.dispose();
    },
    { scope: 'worker' },
  ],
});
```

- **`scope: 'worker'`** — one login per parallel worker, not per test.
- The login response is **schema-parsed inside the fixture**, so a drifted auth contract
  fails once with a clear message instead of cascading into every dependent test as an
  unrelated-looking failure.
- The context is disposed after `use`. A fixture that leaks contexts exhausts the worker.

## 5. UI end-to-end

```ts
import { authTest as test, expect } from '@saucedemo/fixtures';
import { PRODUCTS } from '@saucedemo/data/products';

test.describe('Cart', { tag: '@regression' }, () => {
  test.describe('Remove items', () => {
    test('removing an item updates the cart count', async ({
      authenticatedPage,
      cartPage,
    }) => {
      await authenticatedPage.addToCartByName(PRODUCTS.backpack.name);
      await authenticatedPage.addToCartByName(PRODUCTS.bikeLight.name);
      await authenticatedPage.goToCart();
      await expect(cartPage.getItemCount()).resolves.toBe(2);

      await cartPage.removeItem(PRODUCTS.backpack.name);

      await expect(cartPage.getItemCount()).resolves.toBe(1);
      await expect(cartPage.getItemNames()).resolves.not.toContain(
        PRODUCTS.backpack.name,
      );
    });
  });
});
```

- `authTest`, so the test starts logged in. No credentials anywhere.
- Catalogue values from `@saucedemo/data/products`, not string literals.
- **`await expect(promise).resolves.toBe(…)`**, not `expect(await …).toBe(…)`. The first
  retries; the second reads once and fails on a slow paint.
- Arrange / act / assert separated by blank lines, no comment labels.
- A `@regression`-tagged outer `describe`, behavior-grouped inner `describe`.

## 6. UI — a page object

```ts
import { type Locator } from '@playwright/test';
import { BasePage } from '@core/ui';

export class LoginPage extends BasePage {
  private readonly usernameInput: Locator = this.page.getByTestId('username');
  private readonly passwordInput: Locator = this.page.getByTestId('password');
  private readonly loginButton: Locator = this.page.getByTestId('login-button');
  private readonly errorMessage: Locator = this.page.getByTestId('error');

  async goto() {
    await super.goto('/');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return this.errorMessage.innerText();
  }
}
```

- Extends `BasePage`, so `this.page` exists in the property initializers and `goto` is
  `baseURL`-relative.
- **`readonly` property initializers**, not constructor assignment.
- `getByTestId` resolves `data-test` via `testIdAttribute`.
- Methods read as intent.

The shared-title pattern, one level up:

```ts
export abstract class SauceDemoPage extends BasePage {
  protected readonly pageTitle: Locator = this.page.getByTestId('title');

  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }
}
```

Five pages render the same header, so `getPageTitle()` exists exactly once.

## 7. UI — the auth setup project

```ts
import { test as setup } from '@playwright/test';
import { LoginPage } from '@saucedemo/pages/LoginPage';
import { env } from '@core/config/env';

const authFile = path.join(process.cwd(), '.auth', 'standard_user.json');

setup('authenticate as standard_user', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(env.TEST_USER, env.TEST_PASSWORD);

  // Confirm we actually reached the inventory page before saving state
  await page.waitForURL('**/inventory.html');

  await page.context().storageState({ path: authFile });
});
```

- A **real test** in the `setup` project — visible in the report and trace if it fails,
  which a `globalSetup` function would not be.
- Reuses `LoginPage` rather than raw locators, so `testIdAttribute` applies and a login
  change breaks in one place.
- **`waitForURL` before saving.** Persisting state without confirming the login
  succeeded would write a broken session and fail every dependent test confusingly.
- Credentials from `env`, never literals.

## 8. Accessibility

```ts
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const KNOWN_CRITICAL: Record<string, string[]> = {
  inventory: ['select-name'], // SauceDemo: sort dropdown has no accessible name
  cart: [],
};

async function scanCriticals(page: Page, info: TestInfo, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  await info.attach(`axe-${label}`, {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });

  const critical = violations
    .filter((v) => v.impact === 'critical')
    .map((v) => v.id);
  return critical.filter((id) => !(KNOWN_CRITICAL[label] ?? []).includes(id));
}

test('inventory page has no new critical violations', async ({
  authenticatedPage,
  page,
}, testInfo) => {
  await expect(authenticatedPage.getProductCount()).resolves.toBeGreaterThan(0);
  expect(await scanCriticals(page, testInfo, 'inventory')).toEqual([]);
});
```

The `KNOWN_CRITICAL` map is the whole idea: a real defect in the third-party target is
baselined **by rule id, per page**, so the suite still fails on any new critical
anywhere. See [visual-and-a11y.md](visual-and-a11y.md) for why the alternatives are
worse.

## 9. Visual

```ts
test.describe('Visual regression', { tag: '@visual' }, () => {
  const shot = {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
  } as const;

  test('inventory page', async ({ authenticatedPage, page }) => {
    await expect(authenticatedPage.getProductCount()).resolves.toBeGreaterThan(
      0,
    );
    await expect(page).toHaveScreenshot('inventory.png', shot);
  });
});
```

Shared options as one `as const` object; animations disabled; readiness asserted before
the shot. Baselines are macOS-only and **not gated in CI**.

## 10. Contract

```ts
const productShape = like({
  id: integer(1),
  title: string('Product'),
  price: number(9.99),
});

it('returns a single product for a valid id', async () => {
  await provider
    .given('product with id 1 exists')
    .uponReceiving('a request for product id 1')
    .withRequest({ method: 'GET', path: '/products/1' })
    .willRespondWith({
      status: 200,
      headers: { 'Content-Type': like('application/json') },
      body: productShape,
    })
    .executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/products/1`);

      expect(response.status).toBe(200);
      const body = (await response.json()) as { id: number; title: string };
      expect(body.id).toBe(1);
      expect(typeof body.title).toBe('string');
    });
});
```

- **Matchers, not literals** — the contract claims "a string field `title`", not a
  specific product name.
- The chain is **awaited**. Forgetting that gives a green test that never ran.
- A shared `productShape` across list, single, and search interactions.
- Jest, not Playwright — the one place that is correct. See
  [contract-pact.md](contract-pact.md).

## 11. Performance

```ts
export const thresholds: Options['thresholds'] = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export function envInt(name: string, fallback: number): number {
  const raw = __ENV[name];
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
```

Thresholds **are** the assertion — a breach makes k6 exit non-zero. Percentiles, never
averages. Conservative defaults because the target is a shared public API, overridable
by environment for infrastructure you own.

Note the import style in the scripts themselves: `from './lib/config.ts'` with the
explicit extension, which k6's loader requires and `allowImportingTsExtensions` permits.
Do not "fix" it.

## 12. The regression test

Not a level — a discipline. When fixing a bug:

1. **Write the test first**, at the lowest level that reproduces it.
2. **Run it against the unfixed code and watch it fail.** If it passes, you have not
   reproduced the bug. Say so rather than shipping a test that would always have been
   green.
3. Fix the code.
4. **State in the summary that it fails on the old behavior**, and name the defect.

A real example from this repo's history: the menu logout test never injected
`authenticatedPage`, so the page stayed on `about:blank` and `MenuComponent.open()` timed
out. The fix was to inject the fixture and assert the `'Products'` start state — and the
telling detail is that the test had been _failing for a reason unrelated to the behavior
it claimed to cover_. A test that fails for the wrong reason is a close cousin of a test
that passes for the wrong reason. Both are worth hunting.
