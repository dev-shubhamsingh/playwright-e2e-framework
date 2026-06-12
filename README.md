# Playwright Test Framework

A modular, production-style test framework built with
[Playwright](https://playwright.dev/) and TypeScript. It demonstrates the
patterns real QA/SDET teams use across both **UI** and **API** testing: Page
Object Model, resource clients, dependency-injected fixtures, authentication
state reuse, schema-validated contracts, data-driven tests, typed configuration,
and cross-browser execution — all behind enforced quality gates.

Two domains ship today:

- **SauceDemo** ([saucedemo.com](https://www.saucedemo.com)) — UI e2e suite.
- **DummyJSON** ([dummyjson.com](https://dummyjson.com)) — REST API integration
  suite.

The layout is intentionally modular: a reusable framework `core`, per-domain
folders, and test-type subfolders, so new apps or test types slot in without
touching existing code.

---

## Highlights

- **TypeScript, strict mode** throughout — typed page objects, clients, fixtures.
- **Page Object Model** (UI) and **resource clients** (API) — the same
  encapsulation idea on both sides.
- **Reusable HTTP core** — `ApiClient` with typed request helpers, retry/backoff
  on transient statuses, and request/response captured into the report.
- **Schema-validated API contracts** — [zod](https://zod.dev) schemas double as
  TypeScript types via `z.infer`.
- **Custom fixtures** — page objects and API clients are dependency-injected;
  auth runs once and is reused.
- **Typed, validated configuration** — one zod-checked `env` that fails fast on
  misconfiguration; no scattered `process.env`.
- **Quality gates** — ESLint (flat config + Playwright plugin), Prettier, and a
  husky + lint-staged pre-commit hook.
- **Cross-browser** — Chromium, Firefox, WebKit, plus mobile viewports.
- **Path aliases** — clean imports (`@core/*`, `@saucedemo/*`, `@dummyjson/*`,
  `@shared/*`).
- **Rich diagnostics** — traces, screenshots, and video on failure.

---

## Project Structure

```
.
├── src/
│   ├── core/                   # app-agnostic framework code
│   │   ├── config/             # env.ts — typed, zod-validated environment
│   │   ├── http/               # ApiClient base (retry, report attachments)
│   │   └── ui/                 # BasePage (page handle + baseURL-relative goto)
│   ├── shared/utils/           # helpers + Faker test-data factory
│   ├── saucedemo/              # UI domain
│   │   ├── pages/              # Page Object Model classes
│   │   ├── fixtures/           # base + auth fixtures
│   │   └── data/               # users, products test data
│   └── dummyjson/              # API domain
│       ├── clients/            # AuthClient, ProductsClient (extend ApiClient)
│       ├── fixtures/           # api fixtures (clients + authed request)
│       ├── schemas/            # zod response contracts
│       └── config.ts           # domain view over env
├── tests/
│   ├── saucedemo/
│   │   ├── e2e/                # UI spec files
│   │   └── auth.setup.ts       # logs in once, saves session
│   └── dummyjson/
│       └── api/                # API spec files
├── playwright.config.ts        # projects, browsers, reporters
├── eslint.config.mjs           # flat ESLint config
├── tsconfig.json               # strict + path aliases
└── .github/workflows/          # CI: type-check + full suite on push/PR
```

Test types for a domain live under `tests/<domain>/<type>/`. Planned next:
`tests/dummyjson/{contract,perf}` for Pact and performance suites.

### Path aliases

| Alias          | Path                |
| -------------- | ------------------- |
| `@core/*`      | `src/core/*`        |
| `@config/*`    | `src/core/config/*` |
| `@saucedemo/*` | `src/saucedemo/*`   |
| `@dummyjson/*` | `src/dummyjson/*`   |
| `@shared/*`    | `src/shared/*`      |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
npx playwright install
```

### Configure (optional)

```bash
cp .env.example .env
```

All values have sensible public defaults, so the suite runs out of the box.
Configuration is read through a single typed, zod-validated loader
(`src/core/config/env.ts`) that fails fast with a readable message if a value is
invalid.

| Variable             | Default                     | Used by         |
| -------------------- | --------------------------- | --------------- |
| `BASE_URL`           | `https://www.saucedemo.com` | SauceDemo UI    |
| `TEST_USER`          | `standard_user`             | SauceDemo login |
| `TEST_PASSWORD`      | `secret_sauce`              | SauceDemo login |
| `API_BASE_URL`       | `https://dummyjson.com`     | DummyJSON API   |
| `DUMMYJSON_USERNAME` | `emilys`                    | DummyJSON auth  |
| `DUMMYJSON_PASSWORD` | `emilyspass`                | DummyJSON auth  |

---

## Running Tests

```bash
# Everything (all projects)
npm test

# API suite only (no browser)
npm run test:api

# Tag-filtered suites
npm run test:smoke        # fast critical-path subset (@smoke)
npm run test:regression   # full regression set (@regression)

# UI: headed / interactive / debug
npm run test:headed
npm run test:ui
npm run test:debug

# A single project
npx playwright test --project=api
npx playwright test --project=authenticated
npx playwright test --project=login

# A single spec
npx playwright test tests/dummyjson/api/products.spec.ts

# View the HTML report after a run
npm run report
```

### Test tags

Tests are tagged so suites can be filtered with `--grep`:

- `@smoke` — one representative happy-path test per feature area (UI + API).
  A fast confidence check.
- `@regression` — the full suite. `@smoke` is a strict subset, so smoke tests
  carry both tags.

```bash
npx playwright test --grep @smoke               # smoke only
npx playwright test --grep @regression          # everything
npx playwright test --grep "@smoke" --project=api   # compose with projects
```

### Quality gates

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint .
npm run lint:fix      # eslint . --fix
npm run format        # prettier --write .
npm run format:check  # prettier --check .
```

A husky `pre-commit` hook runs lint-staged, auto-fixing staged files with ESLint
and Prettier before each commit.

---

## Continuous Integration

GitHub Actions (`.github/workflows/playwright.yml`) runs tests in two tiers:

**Required gate — every push / PR to `main`:** a fast, reliable `Chromium + API`
job. It installs Chromium only, type-checks (`tsc --noEmit`), then runs the
`login`, `authenticated`, and `api` projects. This is the job that must stay
green to merge.

**Cross-browser matrix — nightly + on demand:** a separate job (Firefox, WebKit,
mobile-chrome, mobile-safari) that runs on a schedule and via
`workflow_dispatch`. It is kept out of the PR loop because WebKit/mobile are
currently flaky on CI runners, so cross-browser coverage is preserved without
gating merges. Each tier uploads its HTML report as an artifact (retained 14
days).

CI behaviour is also driven by the `CI` env var inside `playwright.config.ts`:
`forbidOnly` is enforced, failed tests retry twice, and workers drop to one for
deterministic, low-noise runs.

---

## Playwright Projects

| Project                         | What it does                                                      |
| ------------------------------- | ----------------------------------------------------------------- |
| `setup`                         | Logs in once via `LoginPage`, saves session to `.auth/`.          |
| `login`                         | Unauthenticated UI login-flow tests.                              |
| `authenticated`                 | UI tests on Chromium, starting logged in (`storageState`).        |
| `firefox`, `webkit`, `mobile-*` | Same authenticated UI tests across browsers and mobile viewports. |
| `api`                           | DummyJSON API tests — no browser, own `baseURL`.                  |

UI projects ignore `**/dummyjson/**`; the `api` project matches only API specs.

---

## UI Testing — SauceDemo

Page Objects encapsulate locators and actions (`src/saucedemo/pages`). Fixtures
inject them into tests, so specs never call `new SomePage(page)` directly.

Page objects extend a small two-tier base: the app-agnostic `@core/ui` `BasePage`
(holds `page`, provides a `baseURL`-relative `goto()`), and `SauceDemoPage` for
the pages sharing the standard header title (`getPageTitle()`). Locators are
`readonly` property initializers; shared parsing lives in `@shared/utils`.

**Authentication runs once.** The `setup` project logs in and saves cookies +
localStorage to `.auth/standard_user.json`. Authenticated projects declare
`dependencies: ['setup']` and load that file as `storageState`, so each test
starts logged in. The `login` project skips this — it needs a clean browser to
test the login flow itself. `.auth/` is gitignored.

| Area           | Scenarios                                                                    |
| -------------- | ---------------------------------------------------------------------------- |
| Login          | valid, invalid (data-driven), locked-out, performance-glitch, redirect guard |
| Inventory      | product display, sorting (4 orders), cart badge, navigation                  |
| Product detail | content, add/remove toggle, back navigation                                  |
| Cart           | contents, prices, quantities, removal, navigation                            |
| Checkout       | happy path, price/tax/total math, form validation, cancel/back               |
| Side menu      | reset app state, all items, logout                                           |

---

## API Testing — DummyJSON

Resource clients (`src/dummyjson/clients`) extend the shared `@core/http`
`ApiClient`, which provides typed `get/post/...` helpers, automatic retry with
backoff on transient statuses (429/503/...), and request/response capture as a
report attachment. Clients return the raw `APIResponse`, so specs own their
status and body assertions. Response bodies are validated against zod schemas
that double as TypeScript types.

**Fixtures** (import from `@dummyjson/fixtures`):

| Fixture          | Scope  | Purpose                                                            |
| ---------------- | ------ | ------------------------------------------------------------------ |
| `authClient`     | test   | Anonymous `AuthClient` for `/auth/*`.                              |
| `productsClient` | test   | Anonymous `ProductsClient` for the public `/products` endpoints.   |
| `authTokens`     | worker | Logs in once per worker; shares access/refresh tokens.             |
| `authedRequest`  | test   | Request context with `Authorization: Bearer <token>` pre-attached. |

The login response is schema-validated inside the `authTokens` fixture, so a
broken auth contract fails fast before dependent tests run. DummyJSON simulates
writes (no persistence); tests assert on the response contract rather than
re-fetching.

| Area     | Scenarios                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------- |
| Auth     | login happy path, invalid credentials (400), `/auth/me` with token, `/auth/me` without token (401) |
| Products | list envelope, pagination (limit/skip), search, sort, field select, single by id, 404 not-found    |

---

## TARS

This project is built alongside **TARS** (Test Automation & Reliability System),
an AI test-automation assistant whose persona, conventions, and patterns are
captured as steering files in the workspace `.kiro/steering/`. TARS follows the
framework's architecture, reliability rules, and commit conventions when writing
or reviewing tests.

---

## Tech Stack

- Playwright Test
- TypeScript (strict)
- zod (response schema validation)
- Faker (test data generation)
- dotenv (environment config)
- ESLint + Prettier + husky + lint-staged (quality gates)
