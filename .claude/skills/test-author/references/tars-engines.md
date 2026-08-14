# TARS Engines — Tools You Should Actually Use

This repo ships its own quality-intelligence tooling. It is not decoration: the
reporter runs on every suite, and the engines answer questions you would otherwise
answer by hand and worse.

If you are triaging a failure, reviewing a suite, or deciding what to run, **check
these first**.

## Mission Control — the reporter

`tars/reporter/TarsReporter.ts`, wired as the fourth reporter in
`playwright.config.ts`. Runs automatically on every `playwright test`.

Outputs, all gitignored because they are per-run:

| File                | Content                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `tars-report.md`    | Human-readable brief: verdict, signals table, per-project and per-tag counts, slowest paths, flake watch |
| `tars-results.json` | The same data machine-readable — the input for every other engine                                        |
| console             | A compact box: verdict, pass rate, flake rate, fail count, wall time                                     |

### What it computes, and why the definitions matter

```ts
const passed = recs.filter((r) => r.outcome === 'expected').length;
const failed = recs.filter((r) => r.outcome === 'unexpected').length;
const flaky = recs.filter((r) => r.outcome === 'flaky');
```

- It keys records **by test id, not per attempt**, so a retried test produces one
  record holding its final attempt. Counting attempts would inflate totals and
  miscount failures the moment retries are on.
- **Flake means `outcome === 'flaky'`** — Playwright's own definition: the test failed
  at least once and then passed. This is the number that matters, and it is invisible
  in a plain pass/fail summary. With `retries: 2` on CI, a flaky test _is_ a green
  test in the exit code.
- **Pass rate excludes skipped** from the denominator (`executed = total - skipped`),
  so skipping tests cannot inflate it.

### Reading it during triage

`tars-report.md` answers three triage questions before you fetch a single log:

1. **Is this flake or a real failure?** The flake-watch section lists every test that
   passed only on retry. A name there is a strong flake signal; a name in the failed
   count with no retry is a strong real-failure signal.
2. **Is the failure concentrated?** The per-project breakdown separates "one spec is
   broken" from "an entire project is broken", which usually means setup or
   environment rather than a test.
3. **Is it a timeout in disguise?** The slowest-paths table shows tests approaching the
   30-second limit. A test at 28 s locally is a test that fails on a loaded runner.

Hard rule the reporter follows, and that you must not break when editing it: **a
reporter must never break the run.** Every hook is wrapped in `try/catch` and degrades
silently. If you add logic there, keep it defensive.

## Risk-based selection

```bash
npm run tars:select                    # explain the decision
npx tsx tars/engine/select.ts --base origin/main
npx tsx tars/engine/select.ts --command    # print just the playwright command
```

Maps changed files to the smallest set of specs that could be affected — test-impact
analysis. The rules:

| Changed file                                                                                                 | Selection                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `src/core/**`, `src/shared/**`, `playwright.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json` | **Full suite.** These can affect anything |
| A spec under `tests/`                                                                                        | That spec                                 |
| `src/saucedemo/**` or `tests/saucedemo/**`                                                                   | `tests/saucedemo`                         |
| `src/dummyjson/**` or `tests/dummyjson/**`                                                                   | `tests/dummyjson`                         |
| Anything else                                                                                                | Nothing test-affecting                    |

**Use it to justify a narrowed verification run.** "I ran only the cart specs" is weak;
"selection mapped this diff to `tests/saucedemo`, and I ran that" is a defensible
scope with a reason attached.

**Treat its output as a claim to check, not gospel.** The mapping is deliberately
coarse — domain-level, not spec-level. If you changed a page object used by four specs,
selection returns the whole domain, which is correct but not minimal. And if you know a
change affects something the rules do not model, run more and say why. A selection that
silently skips a test that would have caught your bug is the worst outcome available
here, which is exactly why the global list escalates to the full suite so readily.

## Auto-quarantine

```bash
npm run tars:quarantine
```

Reads the last run's `tars-results.json`, folds its flaky tests into
`tars/quarantine.json` — a **committed** ledger, deduplicated by `project + title`,
tracking `flakeCount`, `firstSeen`, and `lastSeen`, sorted by flake count.

The ledger is the single source of truth for "known flaky". Tests are **recorded, never
silently deleted** — quarantine is a holding cell, not a graveyard.

### Quarantine discipline

Adding a test to the ledger is not the same as quarantining it, and neither replaces a
fix. Order of preference, and it is not negotiable:

1. **Fix the determinism defect.** This is the answer nearly every time.
2. If it genuinely cannot be fixed in this change, **quarantine explicitly** — which
   requires _all four_:
   - a ticket or issue reference,
   - a one-line reason naming what is non-deterministic and why it is not fixable now,
   - an owner,
   - the quarantine stated **prominently** in your summary, not buried.
3. Never quarantine a P0 test — auth, token handling, checkout totals. Escalate instead.

```ts
// #123: quarantined — the target site's sort dropdown occasionally renders
// after the list, and there is no stable signal to wait on from outside the app.
// Owner: @dev-shubhamsingh
test.skip('sorts products by price', async () => {
```

A `test.skip` with no ticket is not a quarantine, it is a deletion with extra steps.

**Bumping the retry count is not quarantine and is not acceptable.** It hides the
failure rate from everyone, including from Mission Control's flake detection, which is
the only thing that would have surfaced the problem.

### The ledger has a consumer — and it is not automatic

`npm run tars:ledger` reads it:

- **default** — renders it as Markdown, and in CI appends it to the run summary, so
  quarantined tests are visible on the run page rather than buried in a JSON file.
- **`--grep`** — prints a `--grep-invert` pattern excluding entries at or above a
  flake threshold, so a pipeline can _opt into_ skipping them.
- **`--check --fail-at N`** — exits non-zero when a test has flaked N+ times and is
  still unresolved. CI runs this at 10, so a test cannot rot in quarantine forever.

**Nothing auto-skips a test.** That is a deliberate refusal: silent auto-skipping is
exactly how a quarantine ledger becomes a graveyard. Exclusion has to be asked for, in
a step a reviewer can read.

So recording a flake still does not stop it failing the build — say so. What has
changed is that the ledger is now visible and has a deadline.

## Dashboard

```bash
npm run tars:dashboard      # renders tars-dashboard.html from tars-results.json
```

A self-contained HTML dashboard — no build step, no server, no dependencies. Useful
for a visual read of a run, or a screenshot for a pull request.

Requires `tars-results.json`, so run a suite first. It exits with code 1 and a clear
message when the file is absent.

## The autonomous loop, honestly

Sense → Reason → Act, and it is worth knowing exactly where the loop is closed and
where it is not:

| Stage  | Mechanism                                        | Closed?                                                |
| ------ | ------------------------------------------------ | ------------------------------------------------------ |
| Sense  | Reporter ingests every run's results and retries | ✅ Automatic, every run                                |
| Sense  | Selection reads the git diff                     | ✅ On demand                                           |
| Reason | Flake / pass-rate / risk signals computed        | ✅                                                     |
| Reason | Governance docs applied by an agent              | ✅ Loaded as context                                   |
| Act    | Brief + dashboard written                        | ✅                                                     |
| Act    | Ledger updated                                   | ✅ On demand                                           |
| Act    | Ledger surfaced in CI, plus a rot check          | ✅ `tars:ledger` in the `tars` job                     |
| Sense  | Trend across runs, per scope                     | ✅ `tars:trend` + `tars/history.jsonl`                 |
| Reason | Selection audited against real failures          | ✅ `tars:shadow` — fails on a miss                     |
| Reason | Docs audited against the real repo               | ✅ `tars:drift` — in the shared gate                   |
| Act    | Selection used to _narrow_ a CI run              | ◐ Reported and audited; the gate still runs everything |
| Act    | Quarantined tests skipped automatically          | ○ Deliberately not automatic — see below               |

When describing TARS, describe that table. The reporter genuinely runs on every suite;
the engines genuinely work when invoked; **neither engine runs in CI**, so the
"autonomous loop" is closed locally and open in the pipeline. Overstating that is the
one thing that would discredit the whole project.

## Using the engines in a skill workflow

| Task                                               | Reach for                                                   |
| -------------------------------------------------- | ----------------------------------------------------------- |
| Deciding what to re-run after a change             | `npm run tars:select`                                       |
| First look at a red run                            | `tars-report.md` — verdict, flake watch, slowest paths      |
| Separating flake from real failure                 | The flake list, then the history                            |
| Recording a flake you cannot fix now               | `npm run tars:quarantine`, plus a ticket, reason, and owner |
| Checking whether a test is a known repeat offender | `tars/quarantine.json` — `flakeCount` and `firstSeen`       |
| Showing a run to someone                           | `npm run tars:dashboard`                                    |

## Editing the engines

They are inside the `tsc` gate (`tars/**` is in `tsconfig.json` `include`) and the
ESLint run, so `npm run typecheck && npm run lint` covers types and style.

Behavior is another matter — see [framework-code.md](framework-code.md) for the state
of behavioral coverage on this code and what it takes to test it. Changing a threshold,
a selection rule, or a flake definition changes what the whole system reports, so state
the before and after explicitly when you do.
