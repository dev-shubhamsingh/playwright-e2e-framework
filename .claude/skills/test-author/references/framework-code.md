# Framework-Code Tests (the unit level)

The smallest, cheapest level: pure functions and framework classes, no browser, no
network. `parsePrice`, `sumPrices`, the sort predicates, `ApiClient`'s retry and
backoff, `env` validation, the TARS selection rules, the quarantine fold.

> **Status: `✅` shipped.** `npm run test:unit` runs the `unit` Playwright project
> and is gated in CI as the `test-unit` job. About a second — no browser, no network.
> 129 tests across the helpers, `ApiClient`, the env schema, and the TARS engines,
> reporter, and ledger.

## The runner decision

**Playwright's own test runner, as a dedicated `unit` project.** Not Jest.

Reasoning, in order:

1. **No new dependencies.** `@playwright/test` is already the primary runner. Widening
   Jest's `testMatch` would work, but Jest exists here solely because Pact's DSL needs
   it — see [contract-pact.md](contract-pact.md) — and keeping it narrow keeps the
   `test-contract` job's meaning narrow.
2. **One reporting pipeline.** Framework tests appear in the Playwright HTML report,
   Allure, and Mission Control alongside everything else. The reporter measures the
   pass rate and flake rate of the code that produces the pass rate and flake rate,
   which is the right kind of dogfooding.
3. **No browser needed.** A project with no `use.browserName` dependency and no
   `dependencies: ['setup']` starts instantly.
4. **`expect` is fully capable** for pure functions — `toBe`, `toEqual`, `toThrow`,
   `toBeCloseTo`. Nothing about Jest's matchers is needed here.

As shipped:

```ts
// playwright.config.ts — no browser, no dependencies, so it starts instantly
{
  name: 'unit',
  testMatch: '**/unit/**/*.spec.ts',
}
```

```
tests/unit/
  shared/helpers.spec.ts      # parsePrice, sumPrices, roundTo, sort predicates
  core/api-client.spec.ts     # retry, backoff, Retry-After, report attachment
  core/env.spec.ts            # the env schema and its failure message
  tars/select.spec.ts         # every selection rule, including ordering
  tars/quarantine.spec.ts     # the fold, with time injected
  tars/reporter.spec.ts       # counting rules + the defensive contract
  tars/ledger.spec.ts         # threshold filtering, grep escaping, summary
  tars/format.spec.ts         # fmtMs, escapeHtml, dashboard bars()
```

Note `'**/unit/**/*.spec.ts'` rather than `'**/tests/unit/**'` — `testDir` is already
`./tests`, so the pattern is relative to it.

**`tests/unit` is in `UI_TEST_IGNORE`.** Without that, every UI project — including
the four cross-browser ones — would also match these specs and run them once per
browser for no benefit. Any new non-browser suite needs the same treatment.

Plus a `test:unit` script and a gated CI job, or it does not run — see
[ci-gates.md](ci-gates.md).

## The testability problem — read before writing a line

Three of the highest-value targets **cannot be tested as currently written**. This is a
design finding, not a testing problem, and it is exactly what the meta-rule in
[anti-patterns.md](anti-patterns.md) describes.

| File                        | Problem                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `tars/engine/select.ts`     | `select()` and `changedFiles()` are module-private; `main()` executes at import time                 |
| `tars/engine/quarantine.ts` | The fold logic is inline in `main()`; `main()` executes at import time                               |
| `tars/engine/dashboard.ts`  | Rendering is inline in `main()`; `main()` executes at import time                                    |
| `src/core/config/env.ts`    | `envSchema` is private and `safeParse` runs at import; only the already-parsed singleton is exported |

Importing any of them **runs the script**. A spec that does
`import { select } from '@tars/engine/select'` would execute the engine, hit git, and
write to stdout — before the first assertion.

### The fix, and its shape

Separate the **logic** from the **command**. Export pure functions; keep the CLI as a
thin wrapper guarded so it only runs when executed directly:

```ts
// Exported, pure, no side effects — this is what a test imports.
export function select(files: string[]): Selection { … }
export function isGlobal(file: string): boolean { … }

// The command stays a command.
function main(): void { … }

if (require.main === module) {
  main();
}
```

That is not "exporting a private helper just to test it" — the anti-pattern this repo
otherwise forbids. `select(files)` is a genuine pure function with a meaningful
contract; the module currently hides it behind an I/O shell for no reason other than
that it was written as a script. Extracting it improves the design independently of
testing.

For `env.ts`, export the schema alongside the singleton so the validation rules can be
exercised without mutating `process.env` globally:

```ts
export const envSchema = z.object({ … });
export const env = /* parsed singleton, unchanged */;
```

State this refactor explicitly when you make it. It touches files the whole suite
depends on, and a reviewer needs to know the behavior is unchanged.

## What to test, by target

### `src/shared/utils/helpers.ts` — trivial and immediately testable

Fully exported, pure, no dependencies. No refactor needed. P1, high value per minute:

- `parsePrice('$29.99')` → `29.99`; `parsePrice('free')` → `0`; a string with no number;
  a price with no decimals; a price embedded in other text.
- `sumPrices([0.1, 0.2])` → `0.3` — the documented reason this function exists is
  floating-point drift, so that case **is** the contract.
- `roundTo` at a `.5` boundary, and with zero decimals.
- `isSortedAscending` / `isSortedDescending` on an empty array, one element, equal
  adjacent elements, and a genuinely unsorted array. Equal elements are the interesting
  case: both predicates use `<=` / `>=`, so `[1, 1]` is both ascending and descending —
  intended, and worth pinning so a future tightening is a deliberate choice.
- `isAlphabetical` versus `isSortedAscending` on the same input. They disagree, because
  one uses `localeCompare` and the other compares code units. That difference matters —
  the API suite deliberately relies on code-unit ordering to match the server. Pin both.

### `src/core/http/ApiClient.ts` — P0, the highest-value target

Cross-cutting: every API test depends on it. Its retry logic is the kind of code that is
silently wrong for months.

Test through a fake `APIRequestContext` — the class takes one as a constructor
parameter, so no interception machinery is needed:

- A `200` passes straight through with one request.
- A `429` followed by a `200` retries once and returns the `200`.
- A persistent `503` stops after `MAX_RETRIES` and returns the last response — it must
  **not** throw, since specs assert on the status.
- `Retry-After: 1` is honoured over the exponential default.
- A malformed `Retry-After` (`'soon'`, `'-5'`) falls back to backoff and does not
  produce `NaN` — `retryDelayMs` guards with `Number.isFinite` and `>= 0`, which is
  precisely the branch worth pinning.
- A non-retryable status (`400`, `404`) is returned immediately, with no retry.
- `params` with `undefined` values do not reach the wire.
- `attachToReport` is a no-op outside a test rather than throwing — the documented
  behavior, and a real trap if it regresses, because it would break the worker-scoped
  auth fixture.

### `src/core/config/env.ts` — P0

- Every variable absent → all defaults applied.
- An invalid `BASE_URL` → the parse fails with a message naming the field.
- An empty `TEST_USER` → fails `min(1)`.
- The error message lists **every** invalid field, not just the first.

Test the schema, not the singleton. Reassigning `process.env` and re-importing is
brittle and order-dependent; `envSchema.safeParse({ … })` on an explicit object is
deterministic.

### `tars/engine/select.ts` — P0

A wrong answer here silently skips tests, which is the worst failure mode in the repo.

- A `src/core/**` change → `full: true`, and the reason names the triggering file.
- Same for each global path, including `package-lock.json`.
- A changed spec selects itself.
- A `src/saucedemo/**` change selects `tests/saucedemo`.
- A mixed diff across both domains selects both.
- An unrelated file (`README.md`) selects nothing, with the "no test-affecting changes"
  reason.
- An empty file list → `full: false`, paths empty.
- **A global change plus domain changes still returns full** — the loop returns early on
  the first global hit, so ordering must not matter. Pass the global file last.
- Duplicate paths deduplicate (the `Set`).

### `tars/engine/quarantine.ts` — P1

Pure fold over `(existingLedger, flakyFromRun) → nextLedger`:

- A new flake is appended with `flakeCount: 1` and equal `firstSeen` / `lastSeen`.
- A repeat increments `flakeCount`, updates `lastSeen`, and leaves `firstSeen` alone.
- The dedup key is `project + title`, so the same title in two projects yields two
  entries.
- Output is sorted by `flakeCount` descending.
- An empty flake list leaves the ledger untouched.
- A corrupt or absent ledger file falls back to `[]` rather than throwing — `readJson`
  already does this, and it is worth pinning.

Inject the timestamp rather than calling `new Date()` inside the fold, or the test has to
assert on a moving value.

### `tars/reporter/TarsReporter.ts` — P1

The counting rules are the contract, and they are subtle:

- Two attempts of one test produce **one** record, not two.
- `outcome === 'flaky'` counts as flake, not as pass and not as fail.
- Pass rate excludes skipped from the denominator.
- Zero executed tests → `0.0%`, not a division by zero.
- A thrown error inside a hook does not propagate — the defensive contract. This is the
  most important test in the file: a reporter that can break a run is worse than no
  reporter.

### `tars/engine/dashboard.ts` — P2

Lower value, but one real defect to pin: test titles are interpolated into HTML
**unescaped**. A title containing `<`, `>`, or `&` produces malformed markup, and a
title containing a `<script>` tag would be injected into the page. Titles are
self-authored so the security exposure is minimal, but the correctness bug is real. A
test asserting that a title with `<` renders escaped both pins the fix and documents
the expectation.

## Rules for this level

- **Pure functions get direct tests.** No fixtures, no setup.
- **Class dependencies come in through the constructor.** `ApiClient` takes an
  `APIRequestContext`; hand it a fake object. No mocking framework needed, and none is
  installed.
- **Assert the return value or the thrown error.** Never that a fake was called — see
  [anti-patterns.md](anti-patterns.md).
- **Inject time.** Never let a fold or a formatter call `new Date()` internally if a test
  needs to assert its output.
- **No network, no file system, no git.** If a test needs any of those, the seam is in
  the wrong place — extract the pure part.
- **These are fast.** A framework-unit spec that takes a second is doing something it
  should not.

## Verify

Once the `unit` project exists:

```bash
npx playwright test --project=unit
npx playwright test tests/unit/shared/helpers.spec.ts --project=unit
npm run typecheck && npm run lint
```

Until then, `npm run typecheck` is the only gate on this code, and it proves compilation
only. Say that rather than implying coverage.
