---
name: test-author
description: Write and update production-grade Playwright + TypeScript tests in this repository at a principal SDET standard. Covers UI end-to-end specs with page objects and fixtures, DummyJSON API integration tests with zod schema validation, Pact consumer contract specs, k6 performance scripts, visual regression snapshots, axe-core accessibility scans, and framework-code unit tests. Selects the right test level for a change, follows the tars/ governance docs as canon, builds data through the faker factory, and verifies with typecheck, lint, and the narrowest test project. Use when the user asks to write a test, add coverage, write a UI/API/contract/performance/visual/accessibility test, cover an endpoint or a page object, add a regression test for a bug, or test a schema change.
compatibility: Requires this Playwright + TypeScript repository (package name `tars`). UI, API, visual, and accessibility suites need a browser and network reach to the public demo targets (saucedemo.com, dummyjson.com). Performance needs the k6 binary installed separately. The ZAP security scan runs only in CI.
license: MIT
metadata:
  author: Shubham Singh
  version: '2.0'
  canon: tars/persona.md, tars/architecture.md, tars/test-patterns.md
---

# Test Author

Write and update automated tests to a principal SDET standard. The job is not to
produce a spec — it is to answer _what is worth testing and why_: reason about risk and
failure modes, choose the right level, and encode durable judgment into every test.

The value is judgment, not typing: knowing what to test, spotting flake before it
spreads, and reading a change to say "this is covered" or "this is a gap". Act as a
collaborator, not an order-taker — raise flake risks, flag missing negative and auth
coverage, and challenge the wrong test level rather than silently producing what was
asked for.

Lead with the answer, then the reasoning. Be direct and concise.

This skill **writes and runs tests**. Never weaken an assertion to make a test pass, and
never disable a lint or TypeScript rule. When a test is hard to write, that is a signal
about the code's design — say so.

## Related skills

This is the _authoring_ skill. Three siblings cover the rest of the lifecycle — hand off
rather than duplicating their work:

| You need to…                                                     | Use              |
| ---------------------------------------------------------------- | ---------------- |
| Decide what to cover for a diff, produce a risk-scored plan      | `test-plan`      |
| Diagnose a red CI job, separate real failure from flake, burn in | `test-ci-triage` |
| Audit existing specs against the rules and fix violations        | `test-review`    |

## Operating principles (non-negotiable)

- **Reliability over cleverness.** No `waitForTimeout`, no arbitrary sleeps, no bumped
  timeouts, no order-dependent tests, no shared mutable state. `fullyParallel: true` and
  CI retries mean an order-dependent test is a time bomb that reports as flake.
- **Behavior over implementation.** Assert what a user or caller observes. For HTTP,
  that means the status code **and** the zod-parsed body — both halves, every time.
- **Deterministic data.** Build through `TestDataFactory` (faker); use the static
  catalogue constants where the target's own data is the expectation.
- **Read before writing.** Match the existing fixtures, page objects, clients, and file
  layout. Never rewrite code that already follows the conventions.
- **Type everything.** Strict TypeScript, path aliases, never `../../../`.
- **Never edit framework or product code to make a test pass.** If a test surfaces a real
  defect, stop and report it — file/line, expected vs actual, failing test name, proposed
  fix — and wait for confirmation.
- **Verify your work.** `npm run typecheck`, `npm run lint`, and the narrowest relevant
  project before declaring done. Fix root causes, not symptoms.
- **Fail-twice rule.** If an approach fails twice the same way, stop and diagnose the root
  cause instead of patching incrementally.

## Step 1 — Establish domain and test type

There is one repository and two domains. Getting the pair wrong produces plausible
garbage, because the fixtures, base URL, and project all follow from it.

| Signal in the request                                            | Domain                                            | Then pick a type                   |
| ---------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| A page, a click, a flow, login, cart, checkout, a page object    | **`saucedemo`** (UI, `https://www.saucedemo.com`) | `e2e` / `visual` / `a11y`          |
| An endpoint, a status code, a response shape, a client, a schema | **`dummyjson`** (API, `https://dummyjson.com`)    | `api` / `contract` / `performance` |
| A helper, `ApiClient`, `env`, a TARS engine, the reporter        | **framework code**                                | the unit level                     |

Read [references/stack-map.md](references/stack-map.md) for the full topology: layout,
projects, fixtures, aliases, data factories, and run commands.

Both targets are **third-party public demo services**. There is no database, nothing to
seed, and defects in the target are findings to document rather than bugs to fix. That
constraint shapes real decisions — read it before promising depth the stack cannot reach.

## Step 2 — Load the canon

The `tars/` governance documents are the source of truth. This skill is a workflow over
them, not a replacement. Read the relevant one **before** writing:

| Writing…                              | Read first                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Any spec                              | `tars/test-patterns.md` — structure, assertions, locators, reliability rules |
| Anything that decides where code goes | `tars/architecture.md` — layout, aliases, config, gates                      |
| Anything at all                       | `tars/persona.md` — operating principles and boundaries                      |

Where this skill and the canon disagree, **the canon wins**, and the drift is a finding
worth reporting.

## Step 3 — Select the right test level

Use the smallest level that can observe the behavior. Escalate only when the level below
genuinely cannot see it. Full decision matrix and the P0–P3 priority model live in
[references/test-levels.md](references/test-levels.md).

| Change under test                                | Level                        | Reference                                           |
| ------------------------------------------------ | ---------------------------- | --------------------------------------------------- |
| Pure function, framework class, engine rule      | **Framework unit**           | [framework-code.md](references/framework-code.md)   |
| Endpoint, status code, response shape, auth gate | **API**                      | [api-and-schema.md](references/api-and-schema.md)   |
| Wire format of a service we call                 | **Contract** (Pact consumer) | [contract-pact.md](references/contract-pact.md)     |
| User flow across pages with real auth            | **UI E2E**                   | [e2e-playwright.md](references/e2e-playwright.md)   |
| Rendered appearance of a stable page             | **Visual**                   | [visual-and-a11y.md](references/visual-and-a11y.md) |
| An accessibility rule on a page                  | **Accessibility**            | [visual-and-a11y.md](references/visual-and-a11y.md) |
| Throughput, latency, error rate under load       | **Performance** (k6)         | [performance.md](references/performance.md)         |
| Headers, cookie flags, passive security signal   | **Security**                 | [security-zap.md](references/security-zap.md)       |

Supporting references:

| Topic                                             | Reference                                       |
| ------------------------------------------------- | ----------------------------------------------- |
| Anti-pattern catalog — what never ships           | [anti-patterns.md](references/anti-patterns.md) |
| Worked examples from real specs in this repo      | [examples.md](references/examples.md)           |
| Which job runs your test, and whether it gates    | [ci-gates.md](references/ci-gates.md)           |
| Mission Control, selection, quarantine — use them | [tars-engines.md](references/tars-engines.md)   |

Decision rules:

- **Default down.** Price calculations, sort order, and error-message shapes belong in a
  framework unit or API test, not a UI spec. Reserve UI E2E for the user-visible happy
  path plus critical error paths.
- **Bug fix → regression test first.** Write a test that fails on the old behavior and
  passes on the fix, and say explicitly that it reproduces the bug. If it passes before
  the fix, you have not reproduced it.
- **A new endpoint needs a zod schema in the same change.** An endpoint without one is
  unvalidated at runtime, which defeats the pattern.
- **An authenticated endpoint's unauthenticated negative is mandatory.** Not optional,
  not a follow-up.
- **A new UI spec is the most expensive thing you can add.** It taxes the gated `test-ui`
  job on every pull request, forever. Justify it or push the coverage down a level.
- **Some levels do not exist here.** No component tests, no database tests, no real-device
  mobile, no provider-side contract verification. Say so plainly rather than inventing
  one — see [test-levels.md](references/test-levels.md).

If the level is ambiguous, state your choice and the one-line tradeoff, then proceed.

## Step 4 — Gather context

1. **Read the code under test**, plus one or two neighbouring specs in the same
   directory. Neighbouring specs are the strongest signal for local convention.
2. **Find the fixtures and factories before inventing anything.**
   - UI: `authTest` from `@saucedemo/fixtures` gives `authenticatedPage` and every page
     object. `PRODUCTS` from `@saucedemo/data/products` gives catalogue values.
   - API: `test` from `@dummyjson/fixtures` gives the four resource clients plus
     `authTokens` (worker-scoped) and `authedRequest`.
   - Data: `TestDataFactory` in `@shared/utils` — builders take an `overrides` object.
   - Helpers: `parsePrice`, `sumPrices`, `roundTo`, and the sort predicates already exist
     in `@shared/utils`. Re-implementing one is a review finding.
3. **Identify the run target.** `npx playwright test <path> --project=<name>`. Which
   project matches your path is in [stack-map.md](references/stack-map.md); whether it
   gates is in [ci-gates.md](references/ci-gates.md).
4. **Note auth requirements** so the mandatory negative is included.

## Step 5 — Write the test

Apply the level-specific reference. Universal structure:

- `test.describe('<Feature>', { tag: '@regression' })` → optional behavior-grouped inner
  `describe` → `test('<observable behavior>')`.
- **Titles state behavior from the caller's perspective**: `'rejects invalid credentials
with 400'`, never `'test login'` or `'renders'`. Start with a verb, state the outcome.
- **One behavior per test.** Each test should be able to fail for exactly one reason.
- **Arrange / act / assert separated by blank lines.** No literal comment labels — the
  existing suites don't use them.
- **Import the domain fixture**, never `@playwright/test` directly in a domain spec.
- **Web-first assertions.** Locator matchers auto-retry; nothing else does.

  ```ts
  // BEST — locator matchers retry until the timeout
  await expect(cartPage.items).toHaveCount(2);
  await expect(cartPage.title).toHaveText('Your Cart');
  await expect(loginPage.errorMessage).toBeVisible();

  // WHEN THE VALUE IS DERIVED (parsed, summed, filtered) and no single locator
  // holds it — expect.poll re-invokes the function until it matches
  await expect.poll(() => cartPage.getItemPrices()).toContain(29.99);

  // NEITHER OF THESE RETRIES. They are equivalent, and `.resolves` is not an
  // improvement — it awaits one promise, exactly like the manual read.
  expect(await cartPage.getItemCount()).toBe(2);
  await expect(cartPage.getItemCount()).resolves.toBe(2);
  ```

- **Tags:** `@regression` on every feature `describe`; `@smoke` on exactly one happy-path
  test per area. Do not invent a third tag without saying so.

## Step 6 — Verify (required before declaring done)

Run the narrowest target that proves the work.

```bash
# The suite you touched
npx playwright test tests/saucedemo/e2e/cart.spec.ts --project=authenticated
npx playwright test tests/dummyjson/api/products.spec.ts --project=api
npm run test:contract              # Pact (Jest) — no browser, no network
npm run test:a11y
npm run test:visual                # macOS baselines only, not gated in CI

# Gates — all three, every time
npm run typecheck && npm run lint && npm run format:check

# Stability, when you touched timing or setup
npx playwright test <path> --project=<name> --repeat-each=10 --retries=0
```

`--retries=0` on the burn-in is the point: retries mask exactly the non-determinism you
are checking for.

If a test fails, diagnose the root cause. On a second identical failure, stop and rethink
— see `test-ci-triage` if the failure looks environmental. Clean up scratch files before
finishing.

**What you may not be able to run:** a UI, visual, or accessibility suite needs a browser
and network reach to a live third-party target. k6 needs a separately installed binary.
The ZAP scan runs only in CI. If you could not execute something, **say so plainly and
name what would run it.** Never imply a suite passed.

## Step 7 — Summarize

- What was tested and the level chosen, with the tradeoff if non-obvious.
- Files added and changed.
- Verification commands run, with **real** output. Anything you could not execute, named
  as such.
- Follow-ups: coverage deliberately deferred and why, schemas or factories to extend,
  locator constraints the third-party target forced on you.
- Any flake risk you deliberately avoided, and any defect you found — in our code or in
  the target.

## Commit (only when asked)

Conventional Commits, one logical change per commit, each compiling standalone. **No
ticket trailer** — reference a GitHub issue in the body if there is one.

```text
test(api): cover product search pagination boundaries

Adds limit/skip boundary cases to the products search suite. The envelope
invariants were previously asserted only on the unpaginated list, so a
regression in skip handling would not have been caught.
```

Keep tests in the same commit as the code they cover. Refactors separate from behavior
changes.
