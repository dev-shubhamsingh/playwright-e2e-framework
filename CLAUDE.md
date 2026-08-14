# CLAUDE.md — TARS

Playwright + TypeScript quality-engineering framework and product. Package name
`tars`. This file is the entry point; the canon it points at is the real standard.

**Read the canon before writing code.** These three files govern every change,
human or agent:

| Document                                       | Covers                                                  |
| ---------------------------------------------- | ------------------------------------------------------- |
| [tars/persona.md](tars/persona.md)             | Operating principles, voice, boundaries                 |
| [tars/architecture.md](tars/architecture.md)   | Where code goes, path aliases, config, quality gates    |
| [tars/test-patterns.md](tars/test-patterns.md) | Spec structure, assertions, locators, reliability rules |

Everything below is orientation. Where this file and the canon disagree, the canon
wins.

## Ground rules

- **Read before writing.** Match the existing fixtures, page objects, clients, and
  layout. Never rewrite code that already follows the conventions.
- **Type everything.** Strict TypeScript, path aliases (`@core/*`, `@config/*`,
  `@saucedemo/*`, `@dummyjson/*`, `@shared/*`), never `../../../`.
- **Never weaken a test to make it pass.** No relaxed assertion, no sleep, no
  bumped timeout, no retry bump, no `test.skip` without a ticket, reason, and
  owner. If a test surfaces a real defect, report it — file/line, expected vs
  actual — and stop.
- **Never document a capability that does not run.** Every `✅` in a table must be
  executable from a `package.json` script. Designed-but-unshipped is `◐` or `○`,
  and says so.
- **Verify before declaring done.** `npm run typecheck`, `npm run lint`,
  `npm run format:check`, plus the narrowest relevant suite. Report real output; if
  you could not run something, say which and why.
- **Fail-twice rule.** If an approach fails twice the same way, stop and diagnose
  the root cause instead of patching incrementally.
- **Commits:** Conventional Commits, one logical change each, every commit
  compiling standalone. No ticket trailer. Only commit when asked.

## What this repo is

Two domains, both targeting **third-party public demo services** we do not own:

| Domain      | Target                      | Covers                                          |
| ----------- | --------------------------- | ----------------------------------------------- |
| `saucedemo` | `https://www.saucedemo.com` | UI end-to-end, visual regression, accessibility |
| `dummyjson` | `https://dummyjson.com`     | API integration, Pact contracts, k6 performance |

Consequences that shape real decisions: there is **no database to seed**, writes
against the API are **simulated and never persist**, and a defect in a target is a
finding to document rather than a bug to fix.

```
src/core/        env (zod-validated), ApiClient, BasePage — app-agnostic
src/saucedemo/   pages/ fixtures/ data/
src/dummyjson/   clients/ schemas/ fixtures/
src/shared/      helpers, faker test-data factory
tests/           saucedemo/{e2e,visual,a11y} · dummyjson/{api,contract,performance}
tars/            reporter/ engine/ + the three canon docs
.claude/skills/  four agent skills (below)
```

## Commands

```bash
npm test                  # whole Playwright suite
npm run test:unit         # framework's own code — ~1s, no browser, no network
npm run test:api          # --project=api
npm run test:smoke        # --grep @smoke
npm run test:a11y         # accessibility (gated in CI)
npm run test:visual       # visual regression (NOT gated — macOS baselines only)
npm run test:contract     # Pact consumer suite (Jest; no browser, no network)
npm run perf:load         # k6 (needs the k6 binary installed separately)

npm run tars:select       # which specs does this diff affect?
npm run tars:quarantine   # fold the last run's flakes into the ledger
npm run tars:dashboard    # render tars-dashboard.html
npm run tars:ledger       # surface the quarantine ledger (--grep / --check)

npm run typecheck && npm run lint && npm run format:check
```

Narrow before you run: `npx playwright test <path> --project=<name>`.

## Agent skills

Four committed skills under [.claude/skills/](.claude/skills). Invoke by name, or
let them trigger from the request.

| Skill                                                      | Use it to                                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`test-plan`](.claude/skills/test-plan/SKILL.md)           | Decide what's worth testing before writing anything — risk-scored, with locations. Read-only |
| [`test-author`](.claude/skills/test-author/SKILL.md)       | Write the tests, at the right level                                                          |
| [`test-review`](.claude/skills/test-review/SKILL.md)       | Audit existing specs and fix what's safely fixable                                           |
| [`test-ci-triage`](.claude/skills/test-ci-triage/SKILL.md) | Separate real failure from flake from environment                                            |

`test-author/references/` holds the shared per-level corpus all four cite —
[stack-map.md](.claude/skills/test-author/references/stack-map.md) is the fastest
way to orient in this repo. Full guide: [docs/TESTING-SKILLS.md](docs/TESTING-SKILLS.md).

## Honest state — read before claiming coverage

These are real, current gaps. Do not paper over them.

| Gap                                                             | Detail                                                                                                                                                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~Framework code has no behavioral tests~~ — **closed**         | `npm run test:unit` — 129 tests over the helpers, `ApiClient`, the env schema, and the TARS engines/reporter/ledger. Gated as `test-unit`                                                |
| **Visual regression is not gated**                              | Baselines are `*-darwin.png`; a Linux runner would fail every snapshot on antialiasing. Local guard only                                                                                 |
| **WebKit and mobile time out on CI**                            | Every test hits 30 s on the runner while passing locally. Undiagnosed. Nightly and non-gating for this reason                                                                            |
| **TARS selection does not narrow the gate**                     | The `tars` job runs selection and publishes it to the run summary, but CI still runs the full suite. Deliberate: a selection bug that silently skips tests is worse than a slow pipeline |
| **Quarantine is surfaced, never automatic**                     | `npm run tars:ledger` renders it to the CI run summary and fails a job when a test has flaked 10+ times unresolved. Nothing auto-skips — that is how a ledger becomes a graveyard        |
| **Pact is consumer-only**                                       | No broker, no provider verification — and none is achievable against a third-party target. Catches our drift, not theirs                                                                 |
| **No real-device mobile**                                       | `mobile-chrome` / `mobile-safari` are device _emulation_. No native app exists to test                                                                                                   |
| **Every gated suite except `test-contract` needs the internet** | A third-party outage reds the build. Check target reachability before diagnosing a code defect                                                                                           |

## Project memory

`.ai/MEMORY.md` tracks decisions and progress across sessions. It is **gitignored**
(`.ai/`), so it is local-only — read it first if it is present, and update it after
meaningful progress.
