# Stack Map — Test Topology for TARS

Where everything lives, what runs it, and what to reuse instead of reinventing.
Verify against the tree before relying on a path; this file is maintained by hand.

## At a glance

|                        | Value                                                            |
| ---------------------- | ---------------------------------------------------------------- |
| Runner (primary)       | `@playwright/test`                                               |
| Runner (contract only) | Jest + ts-jest, `testMatch` `**/*.pact.ts`                       |
| Load generator         | k6 (TypeScript scripts, run by the `k6` binary)                  |
| Language               | TypeScript strict, `noEmit` — nothing compiles to `dist/`        |
| Domains                | `saucedemo` (UI) and `dummyjson` (API)                           |
| Test id attribute      | `data-test` (set as `testIdAttribute` in `playwright.config.ts`) |
| Schema/contract layer  | zod                                                              |
| Reporters              | Playwright HTML, list, Allure, TARS Mission Control              |

## The two domains

Every test belongs to a **domain** and a **test type**. Establish both before
writing anything — the fixtures, the base URL, and the project all follow from it.

| Domain      | Target                                               | What it exercises                                  | Auth strategy                                                 |
| ----------- | ---------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| `saucedemo` | `https://www.saucedemo.com` (public demo storefront) | Browser UI: login, inventory, cart, checkout, menu | `storageState` written by a setup project, loaded per project |
| `dummyjson` | `https://dummyjson.com` (public demo REST API)       | HTTP: products, carts, users, auth                 | Worker-scoped login fixture → bearer token                    |

Both targets are **third-party public demo services**. We do not own them, cannot
seed them, and cannot fix their defects. That constrains real work:

- No database to set up or truncate. The boundary under test is **HTTP plus zod
  schema validation**, never persisted state.
- Writes are simulated server-side. A `POST /users/add` echoes what you sent and
  leaves the rest blank; it does not create a row you can re-read.
- A defect in the target app is a finding to document, not a bug to fix. The
  accessibility suite does exactly this — see [visual-and-a11y.md](visual-and-a11y.md).

## Source layout

```
src/
  core/                        # app-agnostic framework code
    config/env.ts              # zod-validated env; the ONLY process.env reader
    http/ApiClient.ts          # abstract base for every resource client
    ui/BasePage.ts             # abstract base for every page object
  saucedemo/
    pages/                     # 8 page objects + MenuComponent
    fixtures/                  # base.fixture, auth.fixture (barrel: index.ts)
    data/                      # products.ts, users.ts — static catalogue constants
  dummyjson/
    clients/                   # AuthClient, ProductsClient, CartsClient, UsersClient
    schemas/                   # zod: common, auth, product, cart, user
    fixtures/                  # api.fixture (barrel: index.ts)
    config.ts                  # thin typed view over env
  shared/utils/                # helpers.ts, test-data.factory.ts (barrel: index.ts)

tests/
  unit/                        # framework-code tests: shared/, core/, tars/
  saucedemo/
    auth.setup.ts              # setup project: logs in, writes .auth/standard_user.json
    e2e/                       # cart, checkout, inventory, login, menu, product-detail
    visual/                    # toHaveScreenshot specs + committed *-darwin.png baselines
    a11y/                      # axe-core WCAG scans
  dummyjson/
    api/                       # auth, products, carts, users — HTTP integration
    contract/                  # *.pact.ts consumer contracts (Jest, not Playwright)
    performance/               # k6 scripts + lib/config.ts

tars/                          # the product
  reporter/TarsReporter.ts     # Mission Control
  engine/                      # select, quarantine, ledger, shadow, trend,
                               #   drift, dashboard
  history.jsonl                # committed run history (trend memory)
  lib/format.ts                # fmtMs, escapeHtml — shared by reporter + dashboard
```

Test types for a domain live at `tests/<domain>/<type>/`. A new type gets a new
directory and, if it needs different browser/base-URL settings, its own project in
`playwright.config.ts`.

## Path aliases — always use them

| Alias          | Resolves to         |
| -------------- | ------------------- |
| `@core/*`      | `src/core/*`        |
| `@config/*`    | `src/core/config/*` |
| `@saucedemo/*` | `src/saucedemo/*`   |
| `@dummyjson/*` | `src/dummyjson/*`   |
| `@shared/*`    | `src/shared/*`      |

Never write `../../../`. Aliases are declared in `tsconfig.json` and mirrored into
`jest.config.js` via `moduleNameMapper`, so contract specs import the same way.

## Playwright projects

Declared in `playwright.config.ts`. `--project=<name>` is how you scope a run.

| Project                          | Scope                           | Depends on | Notes                                                             |
| -------------------------------- | ------------------------------- | ---------- | ----------------------------------------------------------------- |
| `setup`                          | `**/auth.setup.ts`              | —          | Writes `storageState`. A real test, visible in the report         |
| `api`                            | `**/dummyjson/api/**/*.spec.ts` | —          | No browser; own `baseURL` (`API_BASE_URL`)                        |
| `login`                          | `**/login.spec.ts`              | —          | Must start logged **out**, so it deliberately skips `setup`       |
| `authenticated`                  | UI specs minus the ignore list  | `setup`    | The main UI project (Chromium)                                    |
| `firefox`, `webkit`              | same as `authenticated`         | `setup`    | Cross-browser; nightly + manual only, non-gating                  |
| `mobile-chrome`, `mobile-safari` | same                            | `setup`    | Device **emulation** — see [e2e-playwright.md](e2e-playwright.md) |
| `visual`                         | `tests/saucedemo/visual`        | `setup`    | Chromium only; not gated in CI                                    |
| `a11y`                           | `tests/saucedemo/a11y`          | `setup`    | Chromium only; gated in CI                                        |

`UI_TEST_IGNORE` in the config keeps `login.spec.ts`, `auth.setup.ts`, the API
specs, and the `visual/`/`a11y/` trees out of the cross-browser projects. If you
add a specialised suite with its own project, add it to that list too or it will
run twice.

## Fixtures — import these, not `@playwright/test`

Specs import from the domain barrel. That is what gives them clients, page
objects, and auth without setup code in the spec.

| Import                                                           | Gives you                                                                                                   |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `import { test, expect } from '@dummyjson/fixtures'`             | `authClient`, `productsClient`, `cartsClient`, `usersClient`, `authTokens` (worker-scoped), `authedRequest` |
| `import { authTest as test, expect } from '@saucedemo/fixtures'` | `authenticatedPage` (an `InventoryPage`, already logged in) plus the page-object fixtures                   |
| `import { test, expect } from '@saucedemo/fixtures'`             | base page-object fixtures without pre-auth — for `login.spec.ts`                                            |

Two auth strategies on purpose: a bearer header is cheaper than a browser session,
so the API domain logs in once per **worker** and shares the token, while the UI
domain persists a browser session once per **run** and reloads it per test.

`authTokens` validates the login response against `loginResponseSchema` inside the
fixture, so a drifted auth contract fails fast in setup rather than as a confusing
cascade across every dependent test.

## Data and helpers — find these before inventing data

| Need                                  | Use                                                                                               | Location                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Randomised per-run entities           | `TestDataFactory` (faker)                                                                         | `@shared/utils/test-data.factory.ts` |
| Reproducible data for a flake hunt    | `TestDataFactory.seed(n)`                                                                         | same                                 |
| The product catalogue (names, prices) | `PRODUCTS`                                                                                        | `@saucedemo/data/products`           |
| Known user accounts                   | `@saucedemo/data/users`                                                                           | same directory                       |
| Price parsing, sums, sort predicates  | `parsePrice`, `sumPrices`, `roundTo`, `isSortedAscending`, `isSortedDescending`, `isAlphabetical` | `@shared/utils`                      |
| Response shape validation             | the domain's zod schema                                                                           | `@dummyjson/schemas`                 |

`TestDataFactory` builders take an `overrides` object so a test pins only the field
it cares about: `buildCheckoutInfo({ postalCode: '' })`.

Do not re-implement a helper that exists. `parsePrice` is already reused across
four page objects; adding a fifth local copy is a review finding.

## The two base classes

**`ApiClient`** (`@core/http`) — every resource client extends it. Never wrap
`APIRequestContext` directly. It provides protected `get/post/put/patch/delete`
with query-param support, retry with backoff on 429/502/503/504 (honouring
`Retry-After`), and request/response attachment to the active test for the HTML
report and trace viewer. Clients return the raw `APIResponse`; the **spec** owns
status and body assertions.

**`BasePage`** (`@core/ui`) — every page object extends it. Holds the `page` handle
and a relative-path `goto()` resolved against `baseURL`, so no page object ever
hard-codes a host. SauceDemo pages showing the standard header title extend
`SauceDemoPage` for a shared `getPageTitle()`.

## Run commands

Everything runs from the repository root. There is no subfolder to change into.

```bash
# Playwright — whole suite, a project, a path, a tag
npx playwright test
npx playwright test --project=api
npx playwright test tests/saucedemo/e2e/cart.spec.ts
npx playwright test --grep @smoke

# Named scripts
npm test                     # playwright test
npm run test:unit            # --project=unit  (framework code; no browser)
npm run test:api             # --project=api
npm run test:smoke           # --grep @smoke
npm run test:regression      # --grep @regression
npm run test:visual          # --project=visual
npm run test:visual:update   # regenerate baselines
npm run test:a11y            # --project=a11y
npm run test:contract        # jest --config jest.config.js  (Pact only)

# Interactive / debugging
npm run test:headed
npm run test:ui
npm run test:debug
npm run report               # open the last HTML report

# Performance (needs the k6 binary installed)
npm run perf:load            # also perf:stress / perf:spike / perf:soak

# Quality gates
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint .
npm run format:check         # prettier --check .

# TARS engines
npm run tars:select          # which specs does this diff affect?
npm run tars:quarantine      # fold the last run's flakes into the ledger
npm run tars:dashboard       # render tars-dashboard.html
npm run tars:ledger          # surface the quarantine ledger
npm run tars:shadow          # audit selection against what actually failed
npm run tars:trend           # delta vs recent runs of the same scope
npm run tars:drift           # verify the docs still match the repo
```

Narrow before you run. `npx playwright test <path> --project=<name>` is almost
always the right verification command; the full suite is rarely what you need.

## Environment

Every value comes from `@core/config/env` — a zod-validated object with a
documented default for **every** variable, which is why the suite runs with zero
setup. Reading `process.env` anywhere else is a finding.

| Variable                                    | Default                          |
| ------------------------------------------- | -------------------------------- |
| `BASE_URL`                                  | `https://www.saucedemo.com`      |
| `TEST_USER` / `TEST_PASSWORD`               | `standard_user` / `secret_sauce` |
| `API_BASE_URL`                              | `https://dummyjson.com`          |
| `DUMMYJSON_USERNAME` / `DUMMYJSON_PASSWORD` | `emilys` / `emilyspass`          |

Overrides go in `.env` (gitignored; `.env.example` is the template). Credentials
here are published demo credentials — that is the only reason they can be
defaults, and it is not a licence to hard-code anything real.

## Tags

Only two tags exist. Do not invent a third without saying so.

| Tag           | Meaning                                                           |
| ------------- | ----------------------------------------------------------------- |
| `@smoke`      | One happy-path test per feature area — a strict subset, ~11 tests |
| `@regression` | Every feature suite carries it                                    |

Applied via the options object: `test.describe('Cart', { tag: '@regression' }, …)`
or `test('…', { tag: '@smoke' }, …)`. The `visual` and `a11y` suites additionally
carry `@visual` / `@a11y` for readability; they are selected by project, not tag.

## Governance documents — the canon

These outrank this file and every skill. Read the relevant one before writing:

| Document                | Covers                                                  |
| ----------------------- | ------------------------------------------------------- |
| `tars/persona.md`       | Operating principles, voice, boundaries                 |
| `tars/architecture.md`  | Where code goes, aliases, config, quality gates         |
| `tars/test-patterns.md` | Spec structure, assertions, locators, reliability rules |
| `CLAUDE.md`             | Entry point; points at the above                        |

A skill is a workflow **over** those documents, not a replacement. Where a skill
and the canon disagree, the canon wins and the drift is a finding worth reporting.
