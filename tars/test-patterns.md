# TARS — Test-Authoring Patterns

> Version-controlled mirror of `.kiro/steering/playwright-test-patterns.md` (the
> file Kiro loads for `**/*.spec.ts`). Kept in sync.

Apply these when writing or editing spec files.

## Structure

- Group with `test.describe('<feature>')`; nest sub-describes for variations.
- Test titles read as behavior: `'rejects invalid credentials with 400'`, not
  `'test login'`. Start with a verb, state the expected outcome.
- One clear behavior per test. Keep arrange/act/assert visually distinct.
- Import the domain fixture, not raw `@playwright/test`:
  `import { test, expect } from '@dummyjson/fixtures';`

## Assertions

- Use web-first, auto-retrying assertions: `await expect(locator).toBeVisible()`,
  `await expect(page).toHaveURL(...)`. They retry until the timeout.
- Never assert on a value you read manually when a web-first matcher exists.
- For API responses, assert the status code explicitly AND validate the body
  against its zod schema (`schema.parse(await res.json())`).
- Prefer specific matchers (`toHaveText`, `toHaveCount`) over generic truthiness.

## Locators (UI)

- Prefer role/label/test-id locators: `getByRole`, `getByLabel`, `getByTestId`.
  This project sets `testIdAttribute: 'data-test'`.
- Encapsulate locators in Page Objects (`src/saucedemo/pages`), never inline raw
  CSS/XPath in specs.

## Reliability — non-negotiable

- No `page.waitForTimeout()` / arbitrary sleeps. Wait for state, not time.
- No order-dependent tests; each test must pass in isolation and in parallel.
- Generate fresh data with the faker factory (`@shared/utils`) rather than
  reusing static values that cause cross-test pollution.
- Use fixtures for setup/teardown; avoid `beforeAll` shared mutable state.

## Data & auth

- Get auth/session from fixtures (`authedRequest`, stored `storageState`), not by
  logging in inside every test.
- Pull credentials and URLs from `@core/config/env`, never hard-coded.

## Tags

- Annotate with `{ tag: ['@smoke'] }` / `'@regression'` so suites can be filtered
  via `--grep`.

## Before finishing

Run `npm run typecheck`, `npm run lint`, and the relevant project
(`npm run test:api` or `npx playwright test --project=<name>`).
