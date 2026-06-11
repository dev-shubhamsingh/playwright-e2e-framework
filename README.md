# Playwright E2E Framework

A modular, production-style end-to-end testing framework built with
[Playwright](https://playwright.dev/) and TypeScript. It demonstrates the
patterns real QA/SDET teams use: Page Object Model, fixtures, authentication
state reuse, data-driven tests, and cross-browser execution.

The first module targets [SauceDemo](https://www.saucedemo.com), a public
e-commerce demo app. The structure is intentionally modular so additional
modules (e.g. API suites against other services) can be added without touching
existing code.

---

## Highlights

- **TypeScript, strict mode** — typed page objects and fixtures
- **Page Object Model** — locators and actions encapsulated per page
- **Custom fixtures** — every page object is dependency-injected into tests
- **Auth via setup project** — login runs once, session reused via `storageState`
- **Data-driven tests** — invalid logins and user types driven from data files
- **Faker-based test data factory** — fresh, realistic data each run
- **Cross-browser** — Chromium, Firefox, WebKit, plus mobile viewports
- **Path aliases** — clean imports (`@saucedemo/*`, `@shared/*`)
- **Rich diagnostics** — traces, screenshots, and video captured on failure

---

## Project Structure

```
.
├── src/
│   ├── shared/                 # app-agnostic, reusable across modules
│   │   └── utils/              # helpers + Faker test-data factory
│   └── saucedemo/              # everything SauceDemo
│       ├── pages/              # Page Object Model classes
│       ├── fixtures/           # base + auth fixtures
│       └── data/               # users, products test data
├── tests/
│   └── saucedemo/
│       ├── e2e/                # spec files
│       └── auth.setup.ts       # logs in once, saves session
├── playwright.config.ts        # projects, browsers, reporters
└── tsconfig.json               # strict + path aliases
```

Adding a new module later is as simple as creating `src/<module>/` and
`tests/<module>/` — the shared utilities and config conventions carry over.

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

Copy the env template and adjust if needed:

```bash
cp .env.example .env
```

Defaults target SauceDemo with the public `standard_user` credentials, so the
suite runs out of the box without any configuration.

---

## Running Tests

```bash
# Run everything (all projects)
npm test

# Headed mode (watch the browser)
npm run test:headed

# Interactive UI mode
npm run test:ui

# Debug mode
npm run test:debug

# A single project
npx playwright test --project=authenticated
npx playwright test --project=login

# A single spec
npx playwright test tests/saucedemo/e2e/cart.spec.ts

# View the HTML report after a run
npm run report
```

---

## How Authentication Works

Login is expensive to repeat in every test, so it runs **once**:

1. The `setup` project (`auth.setup.ts`) logs in through the `LoginPage` and
   saves cookies + localStorage to `.auth/standard_user.json`.
2. Authenticated projects declare `dependencies: ['setup']` and load that file
   as `storageState`, so each test starts already logged in.
3. The `login` project deliberately skips this — it needs a clean,
   unauthenticated browser to test the login flow itself.

`.auth/` is gitignored, so credentials/sessions never reach the repository.

---

## Test Coverage (SauceDemo module)

| Area            | Scenarios |
|-----------------|-----------|
| Login           | valid, invalid (data-driven), locked-out, performance-glitch, redirect guard |
| Inventory       | product display, sorting (4 orders), cart badge, navigation |
| Product detail  | content, add/remove toggle, back navigation |
| Cart            | contents, prices, quantities, removal, navigation |
| Checkout        | happy path, price/tax/total math, form validation, cancel/back |
| Side menu       | reset app state, all items, logout |

---

## Tech Stack

- Playwright Test
- TypeScript
- Faker (test data generation)
- dotenv (environment config)
