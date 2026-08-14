# Anti-Pattern Catalog — What Never Ships

None of these ship. Each entry is a smell, why it hurts, and the fix. If a user
asks for one of these, push back and offer the fix rather than complying silently.

## Reliability / flake

| Anti-pattern                                                            | Why it hurts                                                                                    | Fix                                                                                                                                       |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `page.waitForTimeout(2000)` / any arbitrary sleep                       | Slow and still flaky — elapsed time is not readiness                                            | A web-first assertion (`await expect(locator).toBeVisible()`), `waitForURL`, or `waitForResponse`                                         |
| `locator.click()` after a manual `if (await locator.isVisible())`       | The check and the act are two moments; state can change between them                            | Assert the state, then act — `expect(...).toBeEnabled()` then `click()`                                                                   |
| Order-dependent tests                                                   | `fullyParallel: true` means tests in a file run concurrently across workers                     | Each test arranges its own state; never rely on a sibling having run                                                                      |
| Shared mutable state across tests                                       | One test corrupts another, non-reproducibly                                                     | Build fresh data per test via `TestDataFactory`                                                                                           |
| Relying on `retries: 2` to go green                                     | Hides a real race. The retry budget exists for infrastructure blips                             | Fix the wait. A test that needs a retry to pass is broken — Mission Control will flag it as flake                                         |
| Bumping a timeout to make a test pass                                   | Moves the failure later and slows every run                                                     | Find what you are actually waiting for and assert on it                                                                                   |
| `expect(locator).not.toBeVisible()` immediately after an action         | Passes before the element ever had a chance to appear                                           | Assert a positive post-action state first, then the absence                                                                               |
| Asserting a value you read manually when a web-first matcher exists     | `expect(await p.getTitle()).toBe('X')` reads once; it cannot retry, so it fails on a slow paint | `await expect(p.titleLocator).toHaveText('X')`, or `await expect(p.getTitle()).resolves.toBe('X')` when the page object returns a promise |
| Timing assertions in a functional test (`expect(ms).toBeLessThan(200)`) | Fails on a loaded runner, passes on a fast one, informs nobody                                  | Delete it. Raise the concern in [performance.md](performance.md) terms instead                                                            |
| Depending on data that already exists in the target                     | Public demo services reset and drift without notice                                             | Assert on shape and invariants, not on a specific seeded row                                                                              |
| Hard-coding the host in a page object or client                         | Breaks the moment the target environment changes                                                | Relative paths through `BasePage.goto()` / `ApiClient`, resolved against `baseURL`                                                        |
| `new Date()` or now-relative assertions                                 | Fails at midnight or a month boundary                                                           | Fix the value, or assert the shape rather than the instant                                                                                |
| Teardown that resets shared state after a test                          | If the test crashes, teardown is skipped and the next run inherits the mess                     | Arrange fresh state at the start instead. The UI fixture does this deliberately — a fresh context reloads a clean `storageState` per test |

## Behavior over implementation

| Anti-pattern                                                   | Why it hurts                                                              | Fix                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Asserting a mock was called, as the only assertion             | Verifies the test's own wiring, not the code                              | Assert the return value, the thrown error, or the observable request                                             |
| Asserting a call count                                         | Locks in a number a safe refactor (batching, caching, dedupe) will change | Assert the outcome the count was standing in for                                                                 |
| Asserting log output                                           | Logging is incidental to the contract                                     | Drop it; assert behavior                                                                                         |
| `expect(promise).resolves.not.toThrow()` as the only assertion | Verifies nothing about the contract                                       | Assert the value. For a void boundary, assert the outbound request's method, path, and body                      |
| A test whose title claims two behaviors and asserts one        | Hidden gap behind a reassuring name                                       | Assert both, or split the test                                                                                   |
| Exporting a private function purely so a test can reach it     | Widens the public surface for the test's convenience                      | Exercise it through the public caller — unless the seam is genuinely worth having, in which case say that is why |
| Asserting the response body without the status, or vice versa  | A `200` carrying an error payload slips straight through                  | Assert both. This stack asserts status **and** `schema.parse(body)`                                              |

The one sanctioned exception: a **void-returning boundary call** whose only
observable behavior _is_ the outbound request. There, asserting method, path, and
body **is** the contract. Keep sibling tests in the same block consistent.

## Naming / structure

| Anti-pattern                                                | Fix                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `test('login')`, `test('it works')`, `test('test 1')`       | Behavior from the caller's perspective: `test('rejects invalid credentials with 400')`     |
| A title naming the mechanism (`'calls parsePrice'`)         | Name the outcome. The title must stay true if the internals were rewritten                 |
| A title naming test infrastructure (a fixture or stub name) | Same rule — describe what a user or caller observes                                        |
| Data-driven titles (`'returns 3 when adding 1 and 2'`)      | Name the behavior: `'sums prices to two decimal places'`                                   |
| Arrange / act / assert mashed into one expression           | Keep the three phases visually distinct                                                    |
| Deeply nested `describe`s with no setup to justify them     | Flatten. Nest only when a sub-group shares arrangement                                     |
| A `describe` per method instead of per behavior group       | Group by feature (`'Cart'` → `'Remove items'`), the way the existing suites do             |
| Importing `@playwright/test` directly in a domain spec      | Import the domain fixture barrel — that is where clients, page objects, and auth come from |

## Locators (UI)

| Anti-pattern                                                           | Fix                                                                                                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS class selectors (`.btn_primary`, `.inventory_item`)                | `getByRole` / `getByLabel` first, `getByTestId` (`data-test`) second                                                                          |
| XPath                                                                  | Same. XPath in this repo is always a mistake                                                                                                  |
| Positional selectors (`.nth(0)`, `.first()`) with no scoping container | Scope to a container that has a stable attribute, then select within it                                                                       |
| A raw locator inline in a spec                                         | Locators belong in the page object. A spec should read as intent                                                                              |
| A locator built in the constructor                                     | `readonly` property initializers — the convention across all 8 page objects                                                                   |
| `getByText` for dynamic content                                        | A role or test-id locator, with the text as the assertion rather than the selector                                                            |
| Working around a missing attribute with a brittle selector, silently   | The target is third-party so you cannot add the attribute — use the most stable available locator and **note the constraint** in your summary |

## Setup / data

| Anti-pattern                                            | Fix                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Logging in inside a test                                | `authenticatedPage` (UI) or `authTokens` / `authedRequest` (API)                                              |
| Driving the UI to reach a state an API could set        | Not always avoidable against a third-party target — but never do it when a fixture already provides the state |
| Hand-rolled entity literals scattered across specs      | `TestDataFactory` builders with `overrides`                                                                   |
| A shared static value that two tests both mutate        | Fresh faker data per test                                                                                     |
| A fixture builder with no `overrides` parameter         | Every builder takes `overrides` so a test varies only what matters                                            |
| Reading `process.env` in a spec, client, or page object | `@core/config/env`. It is the single validated entry point                                                    |
| A new `APIRequestContext` built inline in a spec        | The fixture. `authedRequest` already carries the bearer header and disposes itself                            |
| Wrapping `APIRequestContext` directly in a new client   | Extend `@core/http` `ApiClient` — otherwise you lose retry, param handling, and report attachments            |
| A page object that doesn't extend `BasePage`            | Extend it. Otherwise you re-implement `goto` and lose `baseURL` resolution                                    |

## Type / quality

| Anti-pattern                                                        | Fix                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `any` without a comment justifying it                               | A real type. `unknown` plus a zod parse where the shape is genuinely external              |
| `@ts-expect-error` / `@ts-ignore` to get a test compiling           | Fix the type. A cast is acceptable in a test only when it earns its keep, and then say why |
| Disabling a lint rule to make a test pass                           | Fix the root cause                                                                         |
| Weakening an assertion to turn a red test green                     | Never. Fix the code or the expectation, not the assertion's rigor                          |
| Editing framework or product code to make a test pass               | Stop. Report the defect with file/line, expected vs actual, and a proposed fix             |
| Adding a dependency without stating why                             | Say the reason. Prefer what is already installed                                           |
| Skipping the zod parse because "the test asserts the fields anyway" | The parse **is** the contract check; field assertions are the specific claims. Do both     |
| A new endpoint with no schema                                       | Add the schema in the same change                                                          |

## Contract / security (API)

| Anti-pattern                                                    | Fix                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Only the happy path on an authenticated endpoint                | Add the unauthenticated negative. It is mandatory, not optional                 |
| Treating "a token was present" as authorization                 | Assert the actual rejection: status **and** message shape                       |
| A hard-coded id or timestamp in a Pact interaction              | A matcher. A literal makes the contract claim we only accept that one value     |
| A Pact chain that is never awaited or returned                  | The test goes green without running the interaction                             |
| Presenting consumer-only Pact as end-to-end contract protection | Say which half is covered. There is no broker and no provider verification here |
| Making an optional schema field required without a note         | That is a breaking change to the contract — call it out                         |
| Active security scanning against a target you do not own        | Passive baseline only. See [security-zap.md](security-zap.md)                   |

## Coverage theatre

| Anti-pattern                                                                  | Why it hurts                                                                 | Fix                                                                          |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A spec in a directory no project matches                                      | Looks like coverage, executes never                                          | Check the path against the project globs in [ci-gates.md](ci-gates.md)       |
| A spec in a tree the cross-browser projects ignore, assumed to run everywhere | `UI_TEST_IGNORE` silently excludes it                                        | Read the ignore list before claiming cross-browser coverage                  |
| `test.skip` with no reason and no owner                                       | A permanent, invisible gap                                                   | A ticket reference, a reason, an owner — or fix it                           |
| `test.only` committed                                                         | Silently skips every sibling. `forbidOnly` catches it in CI, but not locally | Remove it. Highest-severity finding in this group                            |
| A suite that only asserts a page loaded                                       | No behavior verified                                                         | Assert an interaction or a meaningful value                                  |
| A "regression test" that would have passed before the fix                     | Does not reproduce the bug                                                   | Run it against the old behavior. Green means you have not reproduced it      |
| Claiming a suite passed when you could not execute it                         | Misreports the state of the work                                             | Say exactly what you ran and what you did not                                |
| Silently dropping a scenario you could not reach                              | Invisible gap                                                                | State the deferral and its cause                                             |
| A visual baseline committed for one OS, described as visual coverage in CI    | The `visual` project is not gated; Linux CI has no matching baseline         | Say it is a local guard. See [visual-and-a11y.md](visual-and-a11y.md)        |
| Blanket-ignoring an accessibility rule to get green                           | Discards the regression guard along with the known defect                    | Baseline the specific known rule id per page, so _new_ violations still fail |
| A performance script with no thresholds                                       | k6 exits zero regardless — it measures without asserting                     | Thresholds are the assertion. See [performance.md](performance.md)           |

## The meta-rule

If writing the test is hard, the **code** is usually telling you something: a
missing seam, a function doing too much, a module that runs work at import time,
configuration read from the wrong place. Surface that as feedback rather than
forcing an ugly test into existence.
