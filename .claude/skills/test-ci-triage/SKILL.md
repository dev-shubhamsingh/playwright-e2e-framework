---
name: test-ci-triage
description: Triage a failing or flaky test in this Playwright + TypeScript repository — decide whether it is a real product failure, a flaky test, or an environment problem; find the root cause; drive a burn-in to prove stability; and apply the fix or quarantine it properly. Covers GitHub Actions run and artifact fetching, Playwright traces, videos and HTML reports, TARS Mission Control flake data and the quarantine ledger, third-party target outages, and the unresolved WebKit and mobile CI timeouts. Use when a test is red in CI but green locally, a test fails intermittently, a spec is suspected flaky, a job times out, someone asks to burn in or stabilize a test, or asks whether a failure is real.
compatibility: Requires this Playwright + TypeScript repository (package name `tars`). Needs the `gh` CLI for run logs and artifacts. Reproducing a UI failure needs a browser and network reach to the public demo targets; the Pact suite runs anywhere.
license: MIT
metadata:
  author: Shubham Singh
  version: '2.0'
  canon: tars/persona.md, tars/architecture.md, tars/test-patterns.md
---

# Test CI Triage — Real Failure, Flake, or Environment

A test is red. Determine which of three things is true, and act accordingly:

| Verdict          | Meaning                                                                  | Action                                    |
| ---------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| **Real failure** | The code is broken, or the test correctly caught a regression            | Report the defect. Do not touch the test  |
| **Flaky test**   | The test is non-deterministic; the code is fine                          | Fix the determinism defect in the test    |
| **Environment**  | Runner capacity, the third-party target, tooling, credentials, baselines | Fix the environment; the test is innocent |

Getting this wrong is expensive in both directions. Calling a real failure "flake" ships a
defect. Calling flake a "real failure" burns hours on working code.

**The cardinal rule: never make a test pass by weakening it.** No relaxed assertion, no
added wait, no `test.skip` without a ticket, no retry bump. If the root cause cannot be
fixed here, quarantine explicitly and say so.

Lead with the verdict and a confidence level. Then the evidence. Then the fix.

**One environmental cause dominates in this repo:** every gated suite except
`test-contract` depends on a live third-party public service. Rule that out early — see
Step 2.

## Step 1 — Get the evidence before forming an opinion

Do not theorise from the job name. Fetch the actual failure.

```bash
gh run list --workflow=playwright.yml --limit 20 \
  --json conclusion,headBranch,event,createdAt,displayTitle
gh run view <run-id>                  # job list and results
gh run view <run-id> --log-failed     # the failing step's output
gh run download <run-id>              # all artifacts
gh pr checks <pr-number>              # what's red on this pull request
```

### Artifacts and what each tells you

| Artifact                                       | From                                   | Tells you                                                           |
| ---------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `playwright-report-ui` / `-api` / `-<project>` | `test-ui`, `test-api`, `cross-browser` | Which test failed, the assertion, the error, and the attached trace |
| `allure-results-ui` / `-api` / `-a11y`         | those jobs                             | Same data plus the `ApiClient` request/response attachments         |
| `pacts`                                        | `test-contract`                        | Whether the interactions were generated at all                      |
| `k6-summary-<type>`                            | `performance.yml`                      | Threshold results per metric                                        |
| `zap-baseline-report`                          | `security.yml`                         | Passive scan findings                                               |

Inside the Playwright report, the highest-value artifacts are:

- **The trace** (`trace: 'on-first-retry'`) — open it with
  `npx playwright show-trace <path>`. It gives you the DOM snapshot, network log, and
  console at the moment of failure. This is usually decisive, and it exists **only for
  retried attempts**, which means it exists for exactly the failures you care about.
- **The video** (`video: 'on-first-retry'`) — shows whether an element was moving,
  missing, or covered.
- **The screenshot** (`screenshot: 'only-on-failure'`).

### Mission Control is faster than the logs

Before reading a log, read the run's own brief. `tars-report.md` and
`tars-results.json` answer three triage questions immediately:

- **The flake-watch section** lists every test that passed only on retry. A name there is
  a strong flake signal. A failure with no retry is a strong real-failure signal.
- **The per-project breakdown** separates "one spec broke" from "an entire project broke".
  A whole project failing means setup or environment, not a test.
- **The slowest-paths table** shows tests near the 30-second timeout. A test at 28 s
  locally fails on a loaded runner.

`tars/quarantine.json` tells you whether this test is a **repeat offender** —
`flakeCount` and `firstSeen`. A test flaking for the fifth time is a different
conversation from one flaking for the first.

See [tars-engines.md](../test-author/references/tars-engines.md).

### Establish history — a single failure tells you almost nothing

```bash
# Is it failing on main too? Then it isn't your change.
gh run list --workflow=playwright.yml --branch main --limit 20 \
  --json conclusion,createdAt,displayTitle

# The nightly cross-browser runs
gh run list --workflow=playwright.yml --event=schedule --limit 20 \
  --json conclusion,createdAt
```

A test that is also red on `main` is not caused by your change. **Say that early** — it
saves everyone time, and it splits the work: unblock the branch, ticket the `main` failure
separately.

## Step 2 — Rule out environment first

Environment failures masquerade as test failures and are the most common misdiagnosis.
Check these before reading the test at all.

| Symptom                                                 | Diagnosis                                                                                                                               | Confirm with                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Every** UI test fails, all with timeouts              | **The target site is unreachable or down.** The single most likely cause here                                                           | `curl -sSI https://www.saucedemo.com` — and note `test-contract` is green, since it never leaves the runner |
| Every API test fails with a network error or 5xx        | Same, for `https://dummyjson.com`                                                                                                       | `curl -sSI https://dummyjson.com`                                                                           |
| API tests fail with 429                                 | The shared public API is rate-limiting us. `ApiClient` retries transient statuses, so exhausting that budget means sustained throttling | The Allure request/response attachments                                                                     |
| The `setup` project failed                              | Every authenticated project is skipped or fails downstream. **Read the setup failure, not the test failures**                           | The first failure in the report, not the last                                                               |
| Every test in one project fails identically             | Project-level setup, not the tests                                                                                                      | The first error in the log                                                                                  |
| `webkit` / `mobile-*` all time out at 30 s              | **Known, unresolved.** See below                                                                                                        | The nightly run history                                                                                     |
| A visual test fails on every snapshot                   | Baseline platform mismatch — committed baselines are `-darwin`, the runner is Linux                                                     | The diff images in the report                                                                               |
| `forbidOnly` failure                                    | A `test.only` was committed                                                                                                             | `rg -n '\.only\b' tests/`                                                                                   |
| Job failed with no failing assertion                    | Worker crash or the job timeout                                                                                                         | `timeout-minutes` on the job; the last lines of the log                                                     |
| `npm ci` or `playwright install` failed                 | Infrastructure, not tests                                                                                                               | The setup steps                                                                                             |
| `typecheck` failed, so every test job was skipped       | Every test job `needs: typecheck`. Nothing ran — that is not a pass                                                                     | The job graph                                                                                               |
| The Pact suite fails with "Cannot use import statement" | The `https-proxy-agent` stub is broken or bypassed                                                                                      | [contract-pact.md](../test-author/references/contract-pact.md)                                              |

### The known WebKit and mobile timeout

Every test in the `webkit`, `mobile-chrome`, and `mobile-safari` projects hits the
30-second timeout on the CI runner while passing locally.

**This is unresolved and undiagnosed.** The working hypothesis is network reach from
GitHub's `ubuntu-latest` to the target site rather than a code defect, but that has not
been confirmed. These projects are nightly and non-gating for exactly this reason.

If you are triaging one of these:

- Do **not** treat it as a new failure. Check the run history first; it has been failing
  consistently.
- Do **not** "fix" it by raising the timeout. That would convert a fast, honest failure
  into a slow one.
- Do **not** re-gate these projects on the assumption that it is environmental.
- Diagnosing it properly means: does a bare `curl` from the runner reach the target? Does
  Chromium succeed in the same job where WebKit fails? Is it the first navigation or every
  one? Answering that with evidence is a real contribution — asserting the hypothesis is
  not.

If it's environment: fix the environment or escalate it. **Do not modify the test.** Report
which component failed and what evidence says so.

## Step 3 — Distinguish real failure from flake

Evidence-based, not vibes.

### Signals of a REAL failure

- Fails deterministically — same test, same assertion, every run.
- The assertion message describes a plausible behavior change: a value is wrong, not
  "element not found" or "timed out".
- It fails locally too.
- It correlates with a specific commit that touched related code.
- Several related tests fail together in a way that maps to one behavior.
- It started failing on `main` right after a specific merge.
- `outcome` is `unexpected` with **no retry** — it failed all three attempts.

### Signals of FLAKE

- **It passed on retry.** `outcome === 'flaky'` in the results, and Mission Control lists
  it under flake watch. This is the strongest single signal available.
- The failure message is timing-shaped: element not found, timed out retrying, a value
  that is `undefined` where an async result should be.
- It fails at a different point each run.
- It passes in isolation and fails in the full suite, or the reverse.
- The failure rate tracks runner load rather than code changes.
- The spec reads a value once — `expect(await …)` **or** `expect(…).resolves`, which are
  equivalent — instead of a locator matcher or `expect.poll`.
- It is already in `tars/quarantine.json` with a `flakeCount` above 1.

### The decisive test — burn-in

```bash
# Locally, the narrowest possible target. --retries=0 is essential.
npx playwright test tests/saucedemo/e2e/cart.spec.ts --project=authenticated \
  --repeat-each=20 --retries=0

# In its full suite, to surface cross-test interference
npx playwright test --project=authenticated --repeat-each=5 --retries=0

# A single test by title
npx playwright test --project=authenticated --repeat-each=20 --retries=0 \
  -g 'removing an item updates the cart count'
```

**`--retries=0` is the whole point.** With retries on, a flaky test reports as passing and
the burn-in proves nothing.

Interpretation:

| Result                                           | Means                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| 20/20 green in isolation, red in CI              | Environment, or cross-test interference. Run it inside the full suite next |
| 20/20 green in isolation and in-suite, red in CI | Environment. Runner load, target latency, or the target itself             |
| Fails 1-in-N locally                             | Genuine non-determinism in the test. You can now find it                   |
| Fails every time locally                         | Not flake. Real failure — go back to Step 3                                |

There is no burn-in workflow in this repository. `--repeat-each` locally is the mechanism.
If a burn-in on the runner would settle it, that is worth proposing as a workflow rather
than asserting a conclusion you could not test.

If you cannot execute the test — no browser, no network reach to the target — **say so**
and reason from the artifacts. Do not imply you ran it.

## Step 4 — Find the root cause

The catalog is [anti-patterns.md](../test-author/references/anti-patterns.md). The
recurring causes in this repo:

### Playwright flake

| Cause                                                         | Evidence                                                             | Fix                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `expect(await pageObject.getX()).toBe(…)` or `.resolves`      | Grep the spec. **The most common defect here.** Neither form retries | Expose the `Locator`, use `toHaveText` / `toHaveCount` / `toBeVisible`; `expect.poll` for a derived value |
| `page.waitForTimeout(…)`                                      | Grep the spec                                                        | Assert the state you are actually waiting for                                                             |
| A route registered after the action that triggers the request | Order in the spec                                                    | Move `page.route()` before the action                                                                     |
| Asserting absence with no preceding positive assertion        | The spec reads "act, then assert not-visible"                        | Assert a positive post-action state first                                                                 |
| A weak locator matching more than one element                 | The error names a strict-mode violation                              | Scope to a container, or use a role locator                                                               |
| Clicking through an animation                                 | The video shows the target moving                                    | Assert visible **and** enabled first                                                                      |
| Order dependence                                              | Passes alone, fails in-suite                                         | Arrange everything the test needs; never rely on a sibling                                                |
| Shared static data mutated by two tests                       | Two specs use the same literal                                       | `TestDataFactory`                                                                                         |
| The `setup` project's session going stale mid-run             | Late tests fail auth, early ones pass                                | Check `.auth/standard_user.json` freshness and the setup dependency                                       |
| A test asserting a value from the demo dataset                | It broke with no code change                                         | Assert the invariant instead                                                                              |

### API flake

| Cause                                       | Evidence                                         | Fix                                                                                      |
| ------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Rate limiting (429) beyond the retry budget | Allure attachments show repeated 429s            | Reduce concurrency, or accept it as environmental. Do not raise `MAX_RETRIES` to hide it |
| Assuming a write persisted                  | A read-after-write fails                         | Writes are simulated; assert the response instead                                        |
| Cross-worker token contention               | Fails only with several workers                  | `authTokens` is worker-scoped; confirm nothing logs in per test                          |
| A schema too strict for an optional field   | `ZodError` on a field the target sometimes omits | Mark it optional and comment why                                                         |

### Timeouts

The default is 30 s. Before touching it, ask what is actually slow:

- The **target** is slow — environmental. Report it.
- **`setup` is slow**, so dependent projects start late — read the setup timing.
- The **test does too much** — split it.
- The test is **waiting on something that never happens** — the real bug. A raised timeout
  converts a 30-second failure into a 60-second failure.

**Never raise a timeout to make a test pass.** `workers: 1` on CI already means runs are
serial; a per-test timeout bump on top of that is pure cost.

## Step 5 — Fix, then prove it

1. **Fix the root cause.** For flake, that is the determinism defect. For a real failure,
   that is the code — and the test stays exactly as it is.
2. **Prove it.** `--repeat-each=20 --retries=0` on the narrowed target, then in-suite.
   State the count and the result.
3. **Verify you didn't weaken anything.** Diff the test. If an assertion got looser, a
   timeout got longer, or a wait got added, justify it explicitly or revert it.
4. **Run the gates.** `npm run typecheck && npm run lint && npm run format:check`.

### Quarantine — the last resort

Only when the fix is genuinely out of reach in this change, and only with **all four**:

- A ticket or issue reference, cited in the code.
- A one-line reason: what is non-deterministic, and why it isn't fixable now.
- An owner.
- The quarantine stated **prominently** in your summary, not buried.

```ts
// #123: quarantined — the target site's sort dropdown occasionally renders after
// the product list, and there is no stable signal to wait on from outside the app.
// Owner: @dev-shubhamsingh
test.skip('sorts products by price low to high', async ({ authenticatedPage }) => {
```

Then record it: `npm run tars:quarantine` folds the run's flakes into
`tars/quarantine.json` with a `flakeCount` and timestamps.

**Be honest about what that ledger does.** It is a record, not an enforcement mechanism —
nothing auto-skips a quarantined test and nothing surfaces the ledger in CI. Recording a
flake does not stop it failing the build. Say so.

A `test.skip` with no ticket is not a quarantine, it is a deletion with extra steps. Never
quarantine a P0 test — auth, token handling, checkout totals. Escalate instead.

**Bumping the retry count is not quarantine and is not acceptable.** It hides the failure
rate from everyone, including from the flake detection that would otherwise have surfaced
the problem.

## Step 6 — Report

```markdown
## Verdict

**<Real failure | Flaky test | Environment>** — confidence <high|medium|low>.
<One sentence: what is actually wrong.>

## Evidence

- Failing test: `<file>:<line>` — `<assertion message>`
- Outcome: <unexpected with no retry | flaky, passed on attempt 2 | every test in project X>
- History: <n> of last <m> runs failed; also failing on `main`: yes/no
- Mission Control: <flake watch listing, per-project distribution, slowest paths>
- Quarantine ledger: <flakeCount and firstSeen, or absent>
- Artifacts consulted: <trace / video / Allure attachments — and what they showed>
- Target reachability: <checked / not checked, and the result>
- Reproduction: <what you ran, how many times, the result — or that you could not run it
  and why>

## Root cause

<The specific determinism defect, code defect, or infrastructure failure, with file:line.>

## Fix

<What you changed and why it addresses the cause. Explicitly: no assertion was weakened,
no wait was added, no timeout was raised, no retry was bumped.>

## Proof

<Burn-in command, run count, result. If it could not run here, say so and name what would
run it.>

## Follow-ups

<Other specs with the same defect pattern; infrastructure issues to file; anything you
deliberately left out of scope.>
```

## Judgment calls

- **"Just make CI green."** If the cause is a real failure, say no and report the defect.
  Green CI over broken code is the worst outcome available.
- **"Add a retry / raise the timeout."** Push back. CI already retries twice; more hides
  the failure rate and blinds the flake detection. Fix the wait.
- **Red on `main` and on the branch.** Not caused by the branch. Say so, and split the
  work.
- **Every UI test failed.** Check the target is up before reading a single test. This is
  the highest-prior-probability cause here, and diagnosing a spec when the site was down
  wastes the whole session.
- **A `webkit` or mobile timeout.** Known and unresolved. Do not present the network
  hypothesis as a diagnosis, and do not re-gate on it.
- **A visual test failed in CI.** The `visual` project is not in any workflow. If it ran,
  someone added it — and macOS baselines on a Linux runner fail on antialiasing alone.
- **Flake in a spec unrelated to the current change.** Report it, file it, and don't expand
  the scope silently.
- **Several specs share one flake pattern.** Fix the one in scope, list the others as
  follow-ups with the pattern named. A sweeping cross-cutting fix is a separate change.
- **The failure exposes a missing test rather than a broken one** — the defect slipped
  through because nothing covered the branch. Report the defect, and hand the gap to
  `test-plan`.
- **You genuinely cannot tell.** Say "cannot determine" with the evidence you have and what
  would decide it — a burn-in, a longer artifact retention, a reachability check from the
  runner. A confident wrong verdict costs more than an honest uncertain one.
