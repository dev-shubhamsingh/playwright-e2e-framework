# UI End-to-End Tests (Playwright)

The most expensive level in this repo. Every spec here taxes the gated `test-ui`
job on every pull request, forever. Read [test-levels.md](test-levels.md) and
confirm the behavior cannot be observed lower down before adding one.

The authoring rules are canon in `tars/test-patterns.md`. This file adds the
mechanics and the local topology.

## Golden rules

1. **Import the domain fixture, never `@playwright/test`.**

   ```ts
   import { authTest as test, expect } from '@saucedemo/fixtures';
   ```

   `authTest` gives you `authenticatedPage` (already logged in, on the inventory
   page) plus every page-object fixture. `baseTest` gives page objects without
   pre-auth — use it only where the test must control its own session, which today
   means `login.spec.ts`.

2. **Web-first assertions, always.** `await expect(locator).toBeVisible()` retries
   until the timeout. A manual read cannot retry:

   ```ts
   // Wrong — one read, fails on a slow paint
   expect(await cartPage.getItemCount()).toBe(2);

   // Right — the promise is retried
   await expect(cartPage.getItemCount()).resolves.toBe(2);

   // Better — assert on the locator where the page object exposes one
   await expect(cartPage.items).toHaveCount(2);
   ```

3. **No arbitrary waits.** No `page.waitForTimeout()`. Wait for state:
   `waitForURL`, `waitForResponse`, or a web-first assertion.

4. **Locators live in page objects.** A spec that contains a CSS selector is a
   review finding.

5. **Every test passes in isolation and in parallel.** `fullyParallel: true`.

## Layout

```
tests/saucedemo/
  auth.setup.ts        # the setup project — logs in, writes storageState
  e2e/
    login.spec.ts      # unauthenticated; runs in the `login` project
    inventory.spec.ts
    cart.spec.ts
    checkout.spec.ts
    product-detail.spec.ts
    menu.spec.ts
  visual/              # separate project — see visual-and-a11y.md
  a11y/                # separate project — see visual-and-a11y.md
```

New UI spec → `tests/saucedemo/e2e/<feature>.spec.ts`. It is picked up by the
`authenticated` project automatically. Nothing to register.

Adding it anywhere else means no project matches it and it never runs. Check
[ci-gates.md](ci-gates.md).

## Authentication

Two layers, and understanding the split prevents most auth-related flake.

**`auth.setup.ts`** is a real test in the `setup` project. It drives `LoginPage`,
waits for `**/inventory.html`, and saves cookies plus local storage to
`.auth/standard_user.json`:

```ts
setup('authenticate as standard_user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(env.TEST_USER, env.TEST_PASSWORD);
  await page.waitForURL('**/inventory.html');
  await page.context().storageState({ path: authFile });
});
```

It reuses the page object rather than raw locators, so `testIdAttribute` applies
and a login-page change breaks in one place.

**Every authenticated project** declares `storageState: STORAGE_STATE` and
`dependencies: ['setup']`. Playwright guarantees the session file exists before
those tests start.

**The `authenticatedPage` fixture** then navigates to `/inventory.html` and hands
back an `InventoryPage`.

Consequences worth internalising:

- **No test logs in.** If you find yourself typing credentials in a spec, you are
  in the wrong fixture.
- **Each test gets a fresh browser context** that reloads `storageState` from disk.
  The saved session has an empty cart, so every test starts clean with no teardown.
- **Do not add logout teardown.** It would break tests that intentionally end
  somewhere else — the logout test ends on the login screen by design.
- **`login.spec.ts` must not depend on `setup`.** It has to start logged out. That
  is why the `login` project exists separately and why `login.spec.ts` is in
  `UI_TEST_IGNORE`.

## Page objects

Every page object extends `BasePage` (or `SauceDemoPage` for pages with the
standard header title). The shape is fixed across all eight — match it:

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
}
```

Rules:

- **`readonly` property initializers**, not constructor assignment. `this.page` is
  available in initializers because `BasePage` takes it as a constructor parameter
  property.
- **`private` unless a spec or subclass needs it.** Expose behavior, not locators —
  though exposing a `Locator` deliberately is right when a spec should assert on it
  with `toHaveCount` / `toHaveText`.
- **Relative `goto` through `super.goto(path)`.** Never a full URL.
- **Methods read as intent**: `addToCartByName`, `goToCart`, `fillAndContinue`.
- **Reuse `@shared/utils`.** `parsePrice` is already used across four page objects.
  A local re-implementation is a finding.
- **A new page object needs a fixture** in `base.fixture.ts` and a type entry in
  `PageFixtures`, or specs cannot reach it.

## Locators

Order of preference, and it is not a suggestion:

1. `getByRole('button', { name: 'Checkout' })` — semantics plus accessible name.
2. `getByLabel` / `getByPlaceholder` for form fields.
3. `getByTestId('…')` — resolves `data-test`, configured as `testIdAttribute` in
   `playwright.config.ts`.
4. Scoped text, as a last resort.

Never CSS classes, never XPath, never an unscoped `.nth(0)`.

The target is a third-party site, so **you cannot add a missing attribute**. Where
the available markup forces a weaker locator, use the most stable option and say so
in your summary — that constraint is a real finding about the target, not a licence
to be sloppy.

## Spec shape

Group by feature, then by behavior cluster. Titles state observable behavior.

```ts
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

- One `@regression` tag on the outer `describe`; one `@smoke` on the single
  happy-path test per area.
- Arrange / act / assert visually separated by blank lines. No literal comment
  labels — the existing suites don't use them and consistency wins.
- Static catalogue values from `@saucedemo/data/products`, not string literals.
- Generated data from `TestDataFactory` where the value should vary per run
  (checkout form fields), static constants where the target's own data is the
  expectation (product names and prices).

## Network control

There is no owned backend to stub, but interception is still the right tool for
error paths the live target will never produce on demand:

```ts
// Force a failure the real service won't give you
await page.route('**/inventory.html', (route) => route.abort('failed'));

// Or reshape a response to exercise an empty state
await page.route('**/api/items', (route) =>
  route.fulfill({ status: 200, body: JSON.stringify([]) }),
);
```

Register the route **before** the action that triggers the request. Registering it
after is one of the most common causes of a test that passes locally and fails
under load.

Use this sparingly at the UI level. If you are stubbing the network to test logic,
the logic probably wants an API or framework-unit test instead.

## Device emulation — and what it is not

`mobile-chrome` (`devices['Pixel 5']`) and `mobile-safari` (`devices['iPhone 13']`)
are **emulation**: viewport size, device scale factor, user agent, and touch
support, running in desktop Chromium and WebKit.

They genuinely cover: responsive layout, touch-target reachability, viewport-driven
rendering differences, and mobile-user-agent code paths.

They do **not** cover, and must never be described as covering: native gestures,
platform keyboards, deep links, biometric auth, push notifications, app-store
payment flows, real device performance, or OS-version-specific rendering.

**Real-device native end-to-end testing is out of scope for this repo.** There is no
native application to test — the target is a website. If asked for native mobile
coverage, say that plainly: it would require a device farm and an actual mobile app,
and neither exists here. Do not present emulation as a substitute.

Both mobile projects are also part of the nightly, non-gating cross-browser matrix
and currently hit the unresolved CI timeout described in [ci-gates.md](ci-gates.md).

## Verify

```bash
# The narrowest useful target
npx playwright test tests/saucedemo/e2e/cart.spec.ts --project=authenticated

# Watch it happen
npx playwright test tests/saucedemo/e2e/cart.spec.ts --project=authenticated --headed

# Interactive, for building a locator
npm run test:ui

# Stability check before declaring a timing fix done
npx playwright test tests/saucedemo/e2e/cart.spec.ts --project=authenticated \
  --repeat-each=10 --retries=0

# Gates
npm run typecheck && npm run lint && npm run format:check
```

`--retries=0` on the burn-in is the point: retries would mask exactly the
non-determinism you are trying to detect.

A UI run needs a browser and network reach to the live target. If you cannot launch
one, say so plainly and name what you did not execute. Never imply a suite passed.

## Checklist

- [ ] The behavior genuinely needs a browser — it cannot be observed at the API or
      framework-unit level.
- [ ] Spec is under `tests/saucedemo/e2e/` so a project matches it.
- [ ] Imports `authTest` from `@saucedemo/fixtures`; no direct `@playwright/test`.
- [ ] No login inside the test.
- [ ] All locators in page objects; role-first, then test id.
- [ ] Every assertion is web-first or a retried promise assertion.
- [ ] No `waitForTimeout`, no bumped timeout, no reliance on retries.
- [ ] Titles state observable behavior.
- [ ] Outer `describe` tagged `@regression`; `@smoke` only if this is the area's
      happy path.
- [ ] Passes in isolation, and again with `--repeat-each=5 --retries=0`.
- [ ] `typecheck`, `lint`, `format:check` clean.
