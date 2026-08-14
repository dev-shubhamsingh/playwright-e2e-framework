---
name: test-review
description: Audit existing test code in this Playwright + TypeScript repository against the tars/ governance docs and the anti-pattern catalog, then apply the fixes. Finds false coverage (specs no project matches, skipped specs, status assertions with no schema parse, un-awaited Pact chains, k6 scripts with no thresholds, blanket accessibility ignores), flake defects (manual reads instead of web-first assertions, arbitrary waits, order dependence), locator and structure violations, and missing negative or auth coverage. Use when the user asks to review tests, audit test quality, clean up a spec, check tests against the rules, find weak or fake assertions, fix test smells, or asks whether a spec is any good.
compatibility: Requires this Playwright + TypeScript repository (package name `tars`). This skill writes fixes. Verifying a UI, visual, or accessibility fix needs a browser and network reach to the public demo targets; the Pact suite runs anywhere; k6 needs a separately installed binary.
license: MIT
metadata:
  author: Shubham Singh
  version: '2.0'
  canon: tars/persona.md, tars/architecture.md, tars/test-patterns.md
---

# Test Review — Quality Audit of Existing Specs

The tests exist. The question is whether they are worth the CI time they consume, and
whether the coverage they imply is real.

The most valuable finding here is **false coverage** — a test that looks like protection
and isn't. It is worse than no test, because it stops anyone from writing the real one.

This skill both **finds and fixes**. Default to fixing what is safely fixable and
reporting what isn't. Never fix by weakening: a test that goes from asserting the wrong
thing to asserting nothing is not an improvement.

Be direct and specific, always with `file:line`. Acknowledge good tests when you see them
— a review that only lists faults is less useful and less credible.

## Related

- [test-author/references/anti-patterns.md](../test-author/references/anti-patterns.md) —
  the catalog this review runs against
- [e2e-playwright.md](../test-author/references/e2e-playwright.md),
  [api-and-schema.md](../test-author/references/api-and-schema.md),
  [contract-pact.md](../test-author/references/contract-pact.md),
  [visual-and-a11y.md](../test-author/references/visual-and-a11y.md),
  [performance.md](../test-author/references/performance.md),
  [framework-code.md](../test-author/references/framework-code.md) — the per-level
  standards
- [ci-gates.md](../test-author/references/ci-gates.md) — whether a spec actually runs
- [tars-engines.md](../test-author/references/tars-engines.md) — Mission Control's flake
  data, which tells you which specs are worth reviewing first
- `test-plan` — for _missing_ coverage; this skill is about _existing_ quality
- `test-author` — to write the replacement tests a finding calls for

## Step 1 — Scope and load the canon

Scope from what you were given: a file, a directory, a diff, a pull request, or a domain.
If the ask is "review all our tests", narrow it and say why — a review nobody reads is
worthless.

**Let the data pick the target.** `tars-report.md` from the last run lists flaky tests and
the slowest paths; `tars/quarantine.json` lists repeat offenders with a `flakeCount`. A
spec that appears in either is a better review target than one chosen at random.

Then read the canon. **These are the standard, not this skill:**

- `tars/test-patterns.md` — spec structure, assertions, locators, reliability, tags
- `tars/architecture.md` — where code goes, aliases, the base classes, quality gates
- `tars/persona.md` — operating principles and boundaries

Where a spec and the canon disagree, the canon wins for anything you touch. Where the
canon and the _code_ disagree, that is a finding — report it rather than silently picking
a side.

## Step 2 — Hunt false coverage first

The highest-value pass. Run it before anything cosmetic.

```bash
# Skipped or exclusive tests. Anchor to test/describe — a bare `\.skip\b`
# also matches the pagination field `body.skip` all over the API specs.
rg -n '\b(test|describe|it)\.(skip|only|fixme)\b' tests/ src/

# Manual reads where a retrying assertion exists — the local flake signature
rg -n 'expect\(await ' tests/

# Arbitrary waits and bumped timeouts
rg -n 'waitForTimeout|setTimeout\(|timeout:\s*[0-9]{4,}' tests/

# Status asserted without a schema parse, or the reverse
rg -n 'response\.status\(\)' tests/dummyjson/api
rg -n 'Schema\.parse|schema\.parse' tests/dummyjson/api

# Pact chains that are never awaited or returned
rg -n -B2 '\.executeTest\(' tests/dummyjson/contract

# k6 scripts with no thresholds
rg -ln 'thresholds' tests/dummyjson/performance

# Blanket accessibility suppression rather than a per-page baseline
rg -n 'disableRules|withTags|impact' tests/saucedemo/a11y

# Which project would even run this path?
rg -n 'testMatch|testDir|testIgnore|UI_TEST_IGNORE' playwright.config.ts

# Direct @playwright/test imports in a domain spec (should use the fixture barrel)
rg -n "from '@playwright/test'" tests/saucedemo tests/dummyjson

# Raw selectors that should live in a page object
rg -n "page\.locator\(|\\\$\\(|xpath=|page\.\\\$" tests/saucedemo

# process.env outside the config module
rg -n 'process\.env' src/ tests/ tars/ --glob '!src/core/config/env.ts'
```

### The false-coverage taxonomy

| Finding                                                                  | Why it is false coverage                                                     | Fix                                                                  |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Spec no project matches**                                              | Never executes. Check `testMatch` / `testDir` in the config                  | Move it into a matched tree, or say it is dead                       |
| **Spec in `UI_TEST_IGNORE` assumed cross-browser**                       | Silently excluded from `firefox`/`webkit`/mobile                             | Correct the claim, or add the project                                |
| **Visual spec described as CI coverage**                                 | The `visual` project is not gated; baselines are macOS-only                  | State it is a local guard                                            |
| **`test.skip` with no ticket, reason, or owner**                         | Permanent, invisible gap                                                     | Fix and unskip, or add all four elements of a real quarantine        |
| **`test.only` committed**                                                | Silently skips every sibling locally. Highest-severity finding in this group | Remove immediately                                                   |
| **`expect(await x()).toBe(…)` where a retrying form exists**             | One read, no retry — fails on a slow paint and reports as flake              | `await expect(x()).resolves.toBe(…)` or a locator matcher            |
| **Status asserted, body never parsed**                                   | A `200` carrying an error payload passes                                     | Add `schema.parse(await res.json())`                                 |
| **Body parsed, status never asserted**                                   | The right shape with the wrong code passes                                   | Assert the specific status                                           |
| **A response assertion presented as proof a write persisted**            | Writes are simulated by the target; nothing persists                         | Assert response shape and computed values; state the depth limit     |
| **Pact chain not awaited or returned**                                   | Green without ever running the interaction                                   | `await` the chain                                                    |
| **Pact interaction with a hard-coded id or timestamp**                   | The contract claims we accept only that value                                | Use matchers                                                         |
| **k6 script with no thresholds**                                         | Cannot fail; it only measures                                                | Add thresholds — they are the assertion                              |
| **Accessibility suite ignoring all criticals, or a whole rule globally** | Discards the regression guard along with the known defect                    | Per-page, per-rule-id baseline                                       |
| **A "regression test" that would have passed before the fix**            | Does not reproduce the bug                                                   | Run it against the old behavior                                      |
| **Framework code assumed covered by `typecheck`**                        | Compilation is not behavior                                                  | See [framework-code.md](../test-author/references/framework-code.md) |
| **A test asserting a value from today's demo dataset**                   | Breaks when the target's data drifts, for no real reason                     | Assert the invariant                                                 |

## Step 3 — Then the standards pass

Against `tars/test-patterns.md` and the anti-pattern catalog:

**Reliability**

- No `waitForTimeout`, no arbitrary sleeps, no per-test timeout bumps.
- Every assertion web-first or a retried promise assertion.
- No order dependence — each test must pass alone and in parallel.
- Fresh data per test via `TestDataFactory`; no shared mutable state.
- No teardown that resets state a crashed test would skip.

**Structure and naming**

- `test.describe('<Feature>')`, behavior-grouped inner describes, titles stating
  observable behavior from the caller's perspective.
- One behavior per test; each can fail for exactly one reason.
- Arrange / act / assert visually separated.
- No title naming a mechanism, a fixture, or specific data values.

**Locators (UI)**

- Role and label locators before `getByTestId`; `getByTestId` resolves `data-test`.
- No CSS classes, no XPath, no unscoped `.nth()`.
- Every locator inside a page object, as a `readonly` property initializer.
- Page objects extend `BasePage` (or `SauceDemoPage`).

**API**

- Clients extend `@core/http` `ApiClient` and return the raw `APIResponse`.
- Every response shape has a zod schema, with its inferred type exported.
- The unauthenticated negative exists on every scoped endpoint.
- Auth from `authTokens` / `authedRequest`, never an inline login.

**Types and config**

- No `any` without a justifying comment; no `@ts-expect-error` to get a test compiling.
- No lint suppression to make a test pass.
- No `process.env` outside `@core/config/env`.
- Path aliases everywhere; never `../../../`.

**Tags**

- `@regression` on each feature `describe`; `@smoke` a strict happy-path subset. No
  invented third tag.

## Step 4 — Apply fixes, within a defensible blast radius

Fix, don't just narrate. But scope discipline matters more here than anywhere — a review
that rewrites 40 files is unreviewable and will be reverted.

| Tier                  | Action                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fix now**           | `test.only` left in; `expect(await …)` where a retrying form exists; `waitForTimeout`; a missing schema parse or status assertion; an un-awaited Pact chain; a raw selector in a spec liftable into an existing page object; `process.env` in a spec; a re-implemented `@shared/utils` helper; a direct `@playwright/test` import in a domain spec; an unused import |
| **Fix if in scope**   | Structure and naming violations in a file you are already changing; a missing auth negative on an endpoint you are reviewing anyway; splitting a test whose title claims two behaviors                                                                                                                                                                               |
| **Report, don't fix** | Restructuring a suite you weren't asked to touch; a `test.skip` whose root cause is the third-party target; a finding needing a product decision; anything requiring a new project or CI job to run; a locator forced weak by the target's markup                                                                                                                    |
| **Escalate**          | False coverage on a P0 surface (auth, token handling, checkout totals); a skip on an auth test; a selection or quarantine rule that would silently skip tests; a test whose failure would have caught a live defect                                                                                                                                                  |

Rules while fixing:

- **Never weaken an assertion to make a red test green.** If a test starts failing once it
  asserts something real, **you found a defect** — report it and stop.
- **Never edit framework or product code to make a test pass.** Report it with file/line,
  expected vs actual, and a proposed fix.
- **Don't silently restructure.** If you convert a suite's structure, say so explicitly —
  it makes the diff large and the reviewer needs to know why.
- **Preserve intent.** If a title tells you what the test meant to assert, make it assert
  that — don't substitute something easier.
- **If a fix reveals the test covered nothing**, the honest outcome may be deleting it and
  handing the resulting gap to `test-plan`.
- **A defect in the third-party target is not yours to fix.** Document it. If it would
  make a suite permanently red, baseline it narrowly — per page, per rule — the way the
  accessibility suite does.

## Step 5 — Verify

```bash
# The suite you touched, narrowest first
npx playwright test <path> --project=<name>
npm run test:contract                  # no browser, no network — always runnable
npm run test:a11y

# Stability, whenever you touched timing, waiting, or setup
npx playwright test <path> --project=<name> --repeat-each=10 --retries=0

# Gates
npm run typecheck && npm run lint && npm run format:check
```

`--retries=0` matters: retries mask exactly the non-determinism a timing fix is meant to
remove.

**What you may not be able to run:** UI, visual, and accessibility suites need a browser
and a reachable third-party target. Visual additionally needs macOS to match the committed
baselines — do not regenerate them on another platform. k6 needs a separately installed
binary. The ZAP scan runs only in CI. Say plainly what you did not execute and what would
run it.

## Step 6 — Report

```markdown
## Verdict

<One or two sentences: is this test code trustworthy? What is the most serious finding?
How much of the apparent coverage is real?>

## Scope

<Files reviewed, test count, canon applied, and why you picked this target.>

## False coverage

| #   | File:line         | Finding                                                                     | Severity | Action                                         |
| --- | ----------------- | --------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| 1   | `cart.spec.ts:23` | `expect(await cartPage.getItemCount()).toBe(2)` — single read, cannot retry | High     | Fixed — `await expect(...).resolves.toBe(2)`   |
| 2   | `tests/unit/`     | No project matches; `typecheck` is the only gate on framework code          | High     | Reported — needs a `unit` project and a CI job |

## Standards findings

| #   | File:line           | Rule                                                        | Action                               |
| --- | ------------------- | ----------------------------------------------------------- | ------------------------------------ |
| 3   | `auth.fixture.ts:7` | Docblock references a `global-setup.ts` that does not exist | Fixed — corrected to `auth.setup.ts` |

## What's good

<Genuinely. Which specs are well built and why — the reader should know what to copy, not
only what to avoid.>

## Coverage gaps surfaced

<Behaviors with no real coverage once false coverage is discounted. Hand these to
test-plan.>

## Verification

<Commands run and their real results. What could not be executed, and why.>

## Follow-ups

<Issues to file, patterns repeated elsewhere that were out of scope, target-app defects
documented.>
```

### Reporting rules

- **`file:line` on every finding.** A finding without a location is an opinion.
- **Severity by consequence, not rule-pedantry.** A committed `test.only` outranks a
  naming nit by a wide margin. Order the report that way.
- **Distinguish fixed / reported / escalated** on every row.
- **Say what's good.** It calibrates the rest of the review and gives people a pattern to
  copy.
- **Separate "bad test" from "missing test".** This skill owns the former; say explicitly
  when a finding is really the latter.
- **Never claim you ran something you didn't.**

## Judgment calls

- **"Review all our tests."** Narrow it — one domain, one level, the specs Mission Control
  flagged as flaky, or the P0 surface. Say what you picked and why.
- **A file violates a dozen rules.** Don't list a dozen rows. Group them ("this suite
  predates the web-first assertion rule; 9 instances"), fix the consequential ones, and
  propose the rest as its own change.
- **The canon and the surrounding code disagree.** The canon wins for what you touch. Note
  the drift; don't unilaterally migrate the neighbourhood.
- **Fixing an assertion turns the test red.** You found a defect. Report it with evidence
  and stop; do not revert to the weak assertion.
- **The weak locator is the target's fault.** SauceDemo is third-party; you cannot add an
  attribute. Use the most stable available option and note the constraint. Not a finding
  against the spec author.
- **The test is fine and you found nothing.** Say so. A clean review is a real result, and
  inventing findings to look thorough destroys trust in the ones that matter.
