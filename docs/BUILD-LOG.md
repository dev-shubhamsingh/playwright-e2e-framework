# Build Log

How this framework was built, in order, and what each phase cost. Kept out of the
[README](../README.md) because build history is not what a reader needs first —
but it is worth having, because the tradeoffs are the interesting part.

> **Accuracy note.** An earlier version of this log lived in the README and made
> six claims the code does not support: provider verification "replayed against
> the live API", a "nightly" security scan, visual snapshots "diffed in CI",
> "zero critical/serious violations asserted", scripts under
> `tests/dummyjson/perf/`, and steering files in a `.kiro/` directory that does
> not exist. All six are corrected below. They are recorded rather than quietly
> deleted, because a project whose thesis is honest reporting should show its own
> corrections.

| Phase | Discipline                                                          | Status |
| ----- | ------------------------------------------------------------------- | ------ |
| 0     | Quality gates — ESLint, Prettier, husky, typed env                  | ✅     |
| 1     | API integration — `ApiClient` + DummyJSON auth/products/carts/users | ✅     |
| 2     | Test tagging — `@smoke` / `@regression`                             | ✅     |
| 3     | Base-page abstraction + DRY page objects                            | ✅     |
| 4     | Allure reporting + CI job split                                     | ✅     |
| 5     | Contract testing — Pact, consumer-driven                            | ✅     |
| 6     | Performance testing — k6 load/stress/spike/soak                     | ✅     |
| 7     | Security testing — OWASP ZAP passive baseline                       | ✅     |
| 8     | Visual regression — Playwright snapshots                            | ✅     |
| 9     | Accessibility — axe-core                                            | ✅     |
| 10    | TARS — reporter, engines, canon, agent skills, framework tests      | ✅     |

---

## Phase 0 — Quality gates

ESLint flat config with `typescript-eslint` and the Playwright plugin, Prettier,
husky + lint-staged on pre-commit, zod-validated env, path aliases.

## Phase 1 — `@core/http` ApiClient + API breadth

`ApiClient` with typed verbs, retry/backoff on 429/502/503/504 honouring
`Retry-After`, and request/response attachments to the report. Four resource
clients, zod schemas per resource, 28 API tests. Shared shapes
(`paginationEnvelopeSchema`, `errorResponseSchema`, `deletedFlagsSchema`) lifted
into `common.schema.ts` on the second consumer, not the third.

## Phase 2 — Tagging

Every feature `describe` tagged `@regression`; one happy-path test per area tagged
`@smoke`, as a strict subset. Two tags only — a taxonomy nobody can misremember.

## Phase 3 — BasePage abstraction

`@core/ui/BasePage` holds the `page` handle and a `baseURL`-relative `goto()`,
which removed hard-coded hosts from the page objects. `SauceDemoPage` extends it
with the shared `getPageTitle()` used by five pages. `parsePrice` was extracted to
`@shared/utils` and reused across four page objects rather than reimplemented.

**Bug found and fixed:** the menu logout test never injected `authenticatedPage`,
so the page stayed on `about:blank` and `MenuComponent.open()` timed out. The
telling part is that the test had been failing for a reason unrelated to the
behavior it claimed to cover — a close cousin of a test that _passes_ for the
wrong reason.

## Phase 4 — Allure + CI job split

`allure-playwright` as a third reporter. CI became `typecheck` → parallel test
jobs, each uploading its own HTML and Allure artifacts.

## Phase 5 — Contract testing (Pact)

`@pact-foundation/pact@16` consumer DSL (`PactV3`), 8 interactions across
`{auth,products}.pact.ts`, run by **Jest** + ts-jest.

**Runner choice:** Jest, not Vitest. Vitest was tried first and hit dotenv and
CommonJS friction; Jest is what the Pact ecosystem is built and documented
around. Called out and swapped mid-build rather than forced.

**The gotcha that cost real time:** Pact's root export drags in the provider
verifier, which requires `https-proxy-agent` — shipped as an ESM build Jest cannot
transform ("Cannot use import statement outside a module"). The consumer mock never
uses a proxy, so it is stubbed via `moduleNameMapper` →
`tests/dummyjson/contract/stubs/https-proxy-agent.js`.

**Correction to the earlier claim.** Pact files are **not** "replayed against the
live API for provider verification". There is no broker and no provider
verification. The suite catches _our_ drift from what we declared; it cannot catch
the provider changing. Against a third-party public API that is a structural limit
— nobody is going to verify our contract — not a backlog item.

## Phase 6 — Performance testing (k6)

Scripts in TypeScript under `tests/dummyjson/performance/` (**not** `perf/` — the
earlier claim had the path wrong). Shared `lib/config.ts` holds `BASE_URL`,
thresholds (`p(95)<500`, `errors<1%`, looser for stress and spike), and `envInt`
for env-overridable VU counts with conservative defaults.

**The k6 ↔ tsc tension:** k6's loader requires explicit `.ts` extensions on local
imports; TypeScript only allows that with `allowImportingTsExtensions`, which
requires `noEmit`. Both were added — correct independently, since nothing in this
project is ever compiled. `@types/k6` keeps the scripts inside the `tsc` gate.

CI is `workflow_dispatch` only, with a `choice` input. Never scheduled: the target
is a shared public API.

**Terminal note:** running `brew install k6` in the foreground blocked the shell
for a long time. Long installs belong in the background.

## Phase 7 — Security testing (OWASP ZAP)

`zaproxy/action-baseline@v0.15.0`, **passive baseline only** — spiders and analyses
responses, sends no attack payloads. `fail_action: false`,
`allow_issue_writing: false`, `.zap/rules.tsv` setting three low-signal rules to
`IGNORE` with a reason each and nothing to `FAIL`.

**Correction:** it is **not** a nightly job and does **not** target DummyJSON. It
is `workflow_dispatch` only, defaulting to `https://www.saucedemo.com`. Scheduling
scans of third-party infrastructure looks like reconnaissance; that is why there is
no schedule, and describing one was wrong.

Never run locally — ZAP is a Docker image. Any claim about its results should cite a
dispatched run's artifact.

## Phase 8 — Visual regression

A Chromium-only `visual` project over three deliberately stable pages, with
`animations: 'disabled'` and `maxDiffPixelRatio: 0.01`.

**Correction:** snapshots are **not** "diffed in CI". There is no visual job.
Baselines are committed as `*-visual-darwin.png`, and a Linux runner would fail
every test on font antialiasing. It is a local guard, run deliberately. (The README
had already said this correctly elsewhere — it contradicted itself.)

## Phase 9 — Accessibility

`@axe-core/playwright`, a Chromium `a11y` project over three pages, WCAG 2.0/2.1
A+AA via `withTags`. Gated in CI, because axe output is platform-independent.

**Caught a real defect:** SauceDemo's product-sort `<select>` has no accessible
name (`select-name`, critical).

**Correction:** the suite does **not** assert "zero critical/serious violations".
It asserts zero **new** criticals, per page, against a `KNOWN_CRITICAL` baseline
that documents the one real violation found — and it does not assert on `serious`
at all. The distinction matters: a blanket assertion against an app we cannot fix
would be permanently red, and a blanket ignore would be coverage theatre.

## Phase 10 — TARS

The shift from portfolio artifact to product.

**Mission Control** (`tars/reporter/TarsReporter.ts`) — a custom reporter on every
run: pass rate, flake detection from retries, slowest paths, per-project and
per-tag breakdown → `tars-report.md` + `tars-results.json`. Records are keyed by
test id so retries collapse to one record; flake is Playwright's `outcome ===
'flaky'`, which is invisible in a plain pass/fail summary because with retries on,
a flaky test _is_ a green test. Fully defensive — a reporter must never break a run.

**Engines** — risk-based selection from a git diff (`select.ts`), the auto-quarantine
ledger (`quarantine.ts`), the dashboard renderer (`dashboard.ts`), and the ledger
consumer (`ledger.ts`) that surfaces the ledger in CI and fails a job when a test
has been rotting in quarantine.

**Canon** — `tars/persona.md`, `architecture.md`, `test-patterns.md`, entered via
`CLAUDE.md`. **Correction:** these are not a "mirror of `.kiro/steering/`". No
`.kiro/` directory exists in this repository; the claim was false and has been
removed. The canon is the canon, in-repo.

**Agent skills** — four skills in `.claude/skills/` (`test-plan`, `test-author`,
`test-review`, `test-ci-triage`) with a shared 13-file reference corpus. They cite
the canon rather than restating it, so a rule lives in one place. See
[`TESTING-SKILLS.md`](./TESTING-SKILLS.md).

**Framework tests** — the gap that mattered most: the quality tooling had no tests
of its own. Closing it needed a refactor first, because `select()`, the quarantine
fold, the dashboard renderer, and the env schema were all module-private behind a
`main()` that ran at import time. Pure logic was extracted, the CLIs guarded behind
`require.main === module`, and a `unit` Playwright project added — chosen over
widening Jest so there is one reporting pipeline and Jest stays scoped to Pact.

Findings that fell out of writing them:

- `roundTo(1.255, 2)` returns `1.25`, not `1.26`. `1.255 * 100` is
  `125.49999999999999`, so `Math.round` takes it down. Documented and pinned; the
  intuitive expectation is the wrong one.
- `isAlphabetical` and `isSortedAscending` disagree on mixed case — `localeCompare`
  versus UTF-16 code units. Load-bearing, because the products API sorts by code
  unit and a spec relies on it. Both pinned so nobody "unifies" them.
- `tars/engine/dashboard.ts` interpolated test titles into HTML unescaped. Fixed
  with a shared `escapeHtml`, which also de-duplicated `fmtMs` — it had existed as
  identical copies in the reporter and the dashboard.
- `src/saucedemo/data/users.ts` read `process.env` directly with its own duplicate
  defaults, bypassing the validated `env` module the architecture doc requires.

**CI** — sharded UI runs with blob reports merged into a single report _and_ a
single Mission Control brief covering the whole run (per-shard briefs would each
describe a fraction), Playwright browser caching, lint and format promoted into the
gate, a TARS job publishing selection and the ledger to the run summary, and Pages
publishing of the dashboard and report.
