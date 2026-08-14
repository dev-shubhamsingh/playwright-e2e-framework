# CI Gates — What Runs, When, and Why

Three workflows. Knowing which one owns your test — and whether it gates — is the
difference between coverage and coverage theatre. A spec no job selects is dead
weight that looks like protection.

## `.github/workflows/playwright.yml` — the gate

Triggers: `push` to `main`, `pull_request` to `main`, `workflow_dispatch`, and a
nightly `schedule` at 02:00 UTC.

`typecheck` runs first and every test job `needs` it. A type error fails the build
before a single browser launches.

| Job             | Command                                                                                             | Gates a pull request?                                                               |
| --------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `typecheck`     | `npx tsc --noEmit`                                                                                  | **Yes** — the shared gate                                                           |
| `test-ui`       | `npx playwright test --project=login --project=authenticated`                                       | **Yes**                                                                             |
| `test-api`      | `npx playwright test --project=api`                                                                 | **Yes**                                                                             |
| `test-contract` | `npm run test:contract`                                                                             | **Yes**                                                                             |
| `test-a11y`     | `npm run test:a11y`                                                                                 | **Yes**                                                                             |
| `cross-browser` | `npx playwright test --project=<matrix>` over `firefox`, `webkit`, `mobile-chrome`, `mobile-safari` | **No** — `if:` restricted to `schedule` and `workflow_dispatch`, `fail-fast: false` |

### Which job owns your test

| You wrote a…                                   | Runs in                                                        | Gated                      |
| ---------------------------------------------- | -------------------------------------------------------------- | -------------------------- |
| Spec under `tests/saucedemo/e2e/`              | `test-ui` (as `authenticated`, or `login` for `login.spec.ts`) | Yes                        |
| Spec under `tests/dummyjson/api/`              | `test-api`                                                     | Yes                        |
| `*.pact.ts` under `tests/dummyjson/contract/`  | `test-contract`                                                | Yes                        |
| Spec under `tests/saucedemo/a11y/`             | `test-a11y`                                                    | Yes                        |
| Spec under `tests/saucedemo/visual/`           | **nothing**                                                    | **No — see below**         |
| k6 script under `tests/dummyjson/performance/` | `performance.yml`, manual only                                 | No                         |
| A change to `tars/`, `src/`, or config         | `typecheck` only                                               | Types yes, behavior **no** |

Two of those rows are the interesting ones, and both are honest gaps rather than
oversights.

### Visual regression is not gated

There is no visual job. The `visual` project runs only when someone runs
`npm run test:visual` locally.

The reason: `toHaveScreenshot` baselines are OS- and browser-specific, and the
committed baselines are `*-visual-darwin.png`. A Linux runner would compare macOS
baselines against Linux rendering and fail every test on font antialiasing. Gating
it would mean generating Linux baselines through the Playwright Docker image and
maintaining two sets.

That is a real tradeoff, documented rather than hidden. When you touch a visual
spec, say plainly that CI will not catch a regression in it.

### Framework code has no behavioral gate

`typecheck` compiles `src/`, `tests/`, `tars/`, and `playwright.config.ts`. It
proves the code type-checks. Nothing runs it. See [framework-code.md](framework-code.md)
for the current state of that level and what to do about it.

### Cross-browser is nightly and non-gating

`firefox`, `webkit`, `mobile-chrome`, and `mobile-safari` run on the nightly
schedule and on manual dispatch, never on a pull request.

**Known unresolved issue:** every test in the `webkit` and mobile projects hits the
30-second timeout on the CI runner while passing locally. The working hypothesis is
network reach from GitHub's `ubuntu-latest` to the target site rather than a code
defect, but it is **not diagnosed**. Do not re-gate these projects on that
assumption, and do not describe cross-browser coverage as enforced. If you are
triaging a red cross-browser run, start from
[the triage flow](../../test-ci-triage/SKILL.md) and treat the environment lane as
the leading hypothesis.

## `.github/workflows/performance.yml` — manual only

`workflow_dispatch` with a `choice` input (`load` / `stress` / `spike` / `soak`).
Uses `grafana/setup-k6-action@v1` and `grafana/run-k6-action@v1`, exports
`k6-summary.json` as an artifact.

Never scheduled, never gating, deliberately: the target is a shared public API and
automatically generating load against it would be abusive. Thresholds inside the
script are what make a run pass or fail — see [performance.md](performance.md).

## `.github/workflows/security.yml` — manual only

`workflow_dispatch` with a `target` URL input (default `https://www.saucedemo.com`).
Uses `zaproxy/action-baseline@v0.15.0` with `cmd_options: '-a'` for alpha passive
rules and `.zap/rules.tsv` for tuning.

Deliberately constrained: `fail_action: false` (non-gating),
`allow_issue_writing: false` (no auto-filed issues), passive baseline only, and no
schedule. Scanning third-party infrastructure on a timer looks like
reconnaissance. See [security-zap.md](security-zap.md).

## Runner facts that constrain design

| Fact                                                  | Consequence                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `ubuntu-latest` standard runner: 4 vCPU, 16 GB RAM    | Enough for Playwright, but not unlimited parallelism                                   |
| `retries: 2` when `process.env.CI`                    | A test that passes on retry is recorded as **flake** by Mission Control, not as a pass |
| `forbidOnly: !!process.env.CI`                        | A committed `test.only` fails the build. Locally it silently skips siblings            |
| `workers: 1` on CI                                    | The current setting. Serial execution — see the note below                             |
| `npx playwright install --with-deps chromium` per job | Browser download dominates job time; no browser cache is configured                    |
| `timeout-minutes` 5–30 per job                        | A hung browser fails the job rather than burning the runner budget                     |

**On `workers: 1`:** this is set in `playwright.config.ts` and makes CI runs serial.
It trades wall-clock for determinism against a shared third-party target. It is
also the single biggest lever on CI duration in this repo. If you are asked why CI
is slow, that line is the answer, and raising it means accepting more concurrent
load on a service we do not own.

## Practical implications

- **Check the path before claiming coverage.** A UI spec must be under
  `tests/saucedemo/` and not in `UI_TEST_IGNORE` to run in the cross-browser
  projects. A specialised suite needs a project in `playwright.config.ts` _and_ a
  job in the workflow.
- **A new project needs a new job.** Adding a project to the config does not add it
  to CI. Both, or it never runs.
- **A new gated job taxes every pull request.** Say what it costs before adding one.
- **`typecheck` is not a test.** Green types on a `tars/` change means nothing about
  behavior.
- **Contract tests never touch the network.** Pact runs a local mock server, so
  `test-contract` is fast and immune to target-site outages — unlike every other
  job here, all of which depend on a third party being up.
- **A third-party outage reds the gate.** `test-ui`, `test-api`, and `test-a11y` all
  hit live public services. Before diagnosing a red run as a code defect, check
  whether the target is reachable at all.
