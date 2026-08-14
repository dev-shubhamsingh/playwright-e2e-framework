# Contributing to TARS

Thanks for looking. This document is the short version; the real standard lives in
[`tars/persona.md`](tars/persona.md), [`tars/architecture.md`](tars/architecture.md),
and [`tars/test-patterns.md`](tars/test-patterns.md). Read those before a first
change — they are what review is against.

## Setup

```bash
npm ci
npx playwright install --with-deps chromium
cp .env.example .env     # optional; every value has a working default
```

Node 20 or newer (see [`.nvmrc`](.nvmrc)). Two optional extras:

- **k6** — needed only for the performance scripts: `brew install k6`
- **Allure CLI** — needed only for `npm run allure:open`

## Before you open a pull request

```bash
npm run typecheck && npm run lint && npm run format:check
npm run test:unit                                    # ~1s, no network
npx playwright test <path> --project=<name>           # the suite you touched
```

A pre-commit hook (husky + lint-staged) formats and lints staged files. It is not a
substitute for the three gates above — CI runs all of them.

## What suites exist, and which ones you can run

| Suite           | Command                                       | Needs                                           |
| --------------- | --------------------------------------------- | ----------------------------------------------- |
| Framework unit  | `npm run test:unit`                           | nothing — no browser, no network                |
| Contract (Pact) | `npm run test:contract`                       | nothing                                         |
| API             | `npm run test:api`                            | network reach to `dummyjson.com`                |
| UI              | `npx playwright test --project=authenticated` | a browser + `saucedemo.com`                     |
| Accessibility   | `npm run test:a11y`                           | a browser + `saucedemo.com`                     |
| Visual          | `npm run test:visual`                         | a browser + **macOS** (baselines are `-darwin`) |
| Performance     | `npm run perf:load`                           | the `k6` binary                                 |
| Security        | `gh workflow run security.yml`                | CI only (Docker image)                          |

Both UI and API targets are **third-party public demo services**. If a whole suite
fails at once, check the target is reachable before assuming your change broke it.

## The rules that get changes rejected

These are not style preferences.

- **No weakened tests.** No relaxed assertion, no `waitForTimeout`, no raised
  timeout, no extra retry, no `test.skip` without a ticket, a reason, and an owner.
  If a test surfaces a real defect, report it — don't edit the test to agree.
- **No invented capability in docs.** Every `✅` in a table must be runnable from a
  `package.json` script. Designed-but-unshipped is `◐` or `○`.
- **Web-first assertions.** `await expect(locator).toBeVisible()` or
  `await expect(pageObject.getThing()).resolves.toBe(…)`. A manual
  `expect(await …)` read cannot retry.
- **Locators live in page objects**, role-first, then `data-test` via `getByTestId`.
  Never a CSS class or XPath.
- **Assert status _and_ schema** on every API response. Both halves.
- **The unauthenticated negative is mandatory** on any scoped endpoint.
- **No `process.env`** outside `@core/config/env`.
- **Path aliases** (`@core/*`, `@shared/*`, …), never `../../../`.
- **No `any`** without a comment justifying it.

The full catalog is
[`.claude/skills/test-author/references/anti-patterns.md`](.claude/skills/test-author/references/anti-patterns.md).

## Choosing a test level

Use the smallest level that can observe the behavior. A price calculation belongs in
a framework unit test, not a UI spec; a status code belongs in an API test. A new UI
spec taxes every pull request forever — justify it or push it down.

The decision matrix and the P0–P3 priority model are in
[`test-levels.md`](.claude/skills/test-author/references/test-levels.md).

## Agent skills

Four skills ship in [`.claude/skills/`](.claude/skills) for use with Claude Code:
`test-plan`, `test-author`, `test-review`, `test-ci-triage`. They encode the
conventions above and cite the canon rather than restating it. See
[`docs/TESTING-SKILLS.md`](docs/TESTING-SKILLS.md).

If you change a convention, change it in the canon (`tars/*.md`) — the skills point
there, so there is one place a rule lives.

## Commits and pull requests

[Conventional Commits](https://www.conventionalcommits.org/). One logical change per
commit, and **every commit must compile standalone** — stage shared files (barrels,
fixtures, config) in intermediate states if needed. No ticket trailer; reference a
GitHub issue in the body if there is one.

```text
test(api): cover product search pagination boundaries

The envelope invariants were only asserted on the unpaginated list, so a
regression in skip handling would not have been caught.
```

Prefixes in use: `feat`, `fix`, `test`, `refactor`, `docs`, `build`, `ci`, `chore`,
`style`.

Keep refactors separate from behavior changes. In the pull request, say what you ran
and what you could not run — see the table above for what needs what.

## Reporting a defect

- In **this framework** — open an issue with the file, the expected vs actual, and a
  failing test if you have one.
- In a **target app** (SauceDemo, DummyJSON) — not ours to fix. Document it. If it
  would make a suite permanently red, baseline it narrowly, per page and per rule,
  the way the accessibility suite handles the known `select-name` violation.
- A **security** concern — see [`SECURITY.md`](SECURITY.md).
