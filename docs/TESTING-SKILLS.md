# Agent Skills — Getting Started

Four skills that help you plan, write, review, and debug tests in **this**
repository. They ship with the repo — no install, no marketplace, no plugin.

| Skill                                                         | Ask it to                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| [`test-plan`](../.claude/skills/test-plan/SKILL.md)           | Tell you what's worth testing, before you write anything      |
| [`test-author`](../.claude/skills/test-author/SKILL.md)       | Write the tests                                               |
| [`test-review`](../.claude/skills/test-review/SKILL.md)       | Audit tests that already exist, and fix what's safely fixable |
| [`test-ci-triage`](../.claude/skills/test-ci-triage/SKILL.md) | Work out why CI is red or a test is flaky                     |

## Setup

None. They live at `.claude/skills/<name>/SKILL.md` and are committed, so Claude
Code discovers them whenever you open this repository. If you add or edit one,
Claude Code picks up the change within the session — no restart.

## How to use them

Just describe what you want. Claude picks the skill from your request:

```text
Add API coverage for the carts endpoint, including the auth negative
```

To force a specific one, use its slash command:

```text
/test-author  Add API coverage for the carts endpoint, including the auth negative
```

Use the slash form when you already know which skill you want, or when Claude
picked the wrong one.

### Which skill do I want?

```text
Starting a change, not sure what to cover ......... /test-plan
Know what to write, need the actual test ......... /test-author
Specs you inherited or don't trust ............... /test-review
CI is red, or a test keeps flaking ............... /test-ci-triage
```

A common sequence: `/test-plan` to agree the coverage, `/test-author` to write it,
`/test-ci-triage` if CI complains. `/test-review` stands alone — point it at a file
or directory any time.

## Example prompts

**Planning**

```text
/test-plan  What should I test for the changes on this branch?
/test-plan  Is this pull request adequately covered before I merge?
/test-plan  Audit the coverage on the TARS engines
```

**Writing**

```text
/test-author  Write an API test for GET /carts/user/:id, including the auth negative
/test-author  Add a regression test for the cart-total rounding bug
/test-author  Cover the empty-cart state in the visual suite
/test-author  Add a Pact interaction for the login endpoint
/test-author  Test that ApiClient honours Retry-After
```

**Reviewing**

```text
/test-review  Review tests/saucedemo/e2e for quality
/test-review  Find tests that look like coverage but aren't
/test-review  Are the API specs asserting both status and schema?
```

**CI and flake**

```text
/test-ci-triage  The authenticated project is red on CI but green locally
/test-ci-triage  Is this spec flaky? Burn it in.
/test-ci-triage  <paste a failing GitHub Actions run URL>
```

## What they cover

The skills know this stack's real test levels — not a generic set:

| Level               | Harness                | Where                            | Gated in CI |
| ------------------- | ---------------------- | -------------------------------- | ----------- |
| Framework unit      | —                      | _no runner yet_                  | No          |
| API integration     | `@playwright/test`     | `tests/dummyjson/api/`           | Yes         |
| Contract (consumer) | Pact + Jest            | `tests/dummyjson/contract/`      | Yes         |
| UI end-to-end       | `@playwright/test`     | `tests/saucedemo/e2e/`           | Yes         |
| Accessibility       | `@axe-core/playwright` | `tests/saucedemo/a11y/`          | Yes         |
| Visual regression   | `toHaveScreenshot`     | `tests/saucedemo/visual/`        | **No**      |
| Performance         | k6                     | `tests/dummyjson/performance/`   | No (manual) |
| Security            | OWASP ZAP baseline     | `.github/workflows/security.yml` | No (manual) |

Two rows deserve a second look, and the skills will tell you the same thing:

- **Framework unit has no runner.** `jest.config.js` matches `**/*.pact.ts` only,
  and no Playwright project matches a unit spec. So `src/core/`, `src/shared/`, and
  `tars/` are type-checked and never executed. `test-plan` will report this as the
  largest gap in the repo;
  [framework-code.md](../.claude/skills/test-author/references/framework-code.md)
  covers the runner decision and the refactor it needs.
- **Visual regression is not gated.** Baselines are macOS-only, so a Linux runner
  would fail every snapshot on font antialiasing. It's a deliberate tradeoff, not
  an oversight.

## What to expect

**They follow the repo's rules, not their own.** `tars/persona.md`,
`tars/architecture.md`, and `tars/test-patterns.md` are the canon. The skills cite
those documents rather than restating them, so there is one place a rule lives. When
a skill and the canon disagree, the canon wins — and the skill is told to report the
drift.

**They will push back.** Ask for a UI end-to-end test where an API test would do, or
to skip the auth negative on a scoped endpoint, and you'll get an argument with a
reason before anything is written.

**They won't fake a green test.** No weakened assertion, no added sleep, no bumped
timeout, no retry bump. If a test fails because the code is broken, you get the
defect report — not an edit to make the test agree with the bug.

**They tell you what they actually ran.** Which matters here, because several things
cannot be run by an agent:

| Cannot run                             | Why                                                                                     | What does run it                                |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Any UI, visual, or accessibility suite | Needs a browser **and** network reach to a live third-party site                        | `npm run test:a11y` etc. on a machine with both |
| Visual baseline updates off macOS      | Committed baselines are `*-darwin.png`; regenerating elsewhere breaks them for everyone | `npm run test:visual:update` on macOS           |
| k6 performance scripts                 | `k6` is a separate binary, not an npm dependency                                        | `brew install k6`, then `npm run perf:load`     |
| The ZAP security scan                  | Ships as a Docker image; only wired into CI                                             | `gh workflow run security.yml`                  |
| Real-device mobile anything            | No native app exists; the mobile projects are emulation                                 | Nothing here — genuinely out of scope           |

The Pact suite (`npm run test:contract`) is the exception: no browser, no network.
It's the useful first check when you suspect an environment problem elsewhere.

## Troubleshooting

**Claude used a different skill than I wanted.** Use the explicit slash command —
`/test-review` rather than "review my tests".

**The slash command isn't listed.** Confirm the file exists at
`.claude/skills/<name>/SKILL.md` with `name` and `description` in its frontmatter. If
you created the `.claude/skills/` directory during this session, restart Claude Code
so it watches the new directory.

**A test it wrote didn't run in CI.** Check the spec's path against the `testMatch` /
`testDir` globs in `playwright.config.ts`, and check `UI_TEST_IGNORE`. A spec no
project matches is silently skipped —
[ci-gates.md](../.claude/skills/test-author/references/ci-gates.md) maps every path
to its job.

**Every UI test failed at once.** Almost always the target site, not your code. Every
gated suite except `test-contract` depends on a live public service. `test-ci-triage`
checks this first, and so should you.

**It says a suite has no coverage but `typecheck` passes.** Correct. Compilation is
not behavior — see the framework-unit row above.

## Structure

```
.claude/skills/
  test-plan/SKILL.md          # read-only: disallowed-tools blocks Edit/Write
  test-author/SKILL.md
  test-author/references/     # the shared corpus all four skills cite
    stack-map.md              # topology, projects, fixtures, commands — start here
    test-levels.md            # level selection + the P0–P3 priority model
    anti-patterns.md          # what never ships
    e2e-playwright.md
    api-and-schema.md
    contract-pact.md
    framework-code.md
    visual-and-a11y.md
    performance.md
    security-zap.md
    ci-gates.md               # which job runs your test, and whether it gates
    tars-engines.md           # Mission Control, selection, quarantine
    examples.md               # worked examples from real specs in this repo
  test-review/SKILL.md
  test-ci-triage/SKILL.md
```

The references live under `test-author/` because it's their primary consumer; the
other three cite them by relative path. Only `SKILL.md` bodies load into context when
a skill triggers — references are read on demand, so the corpus costs nothing until
it's needed.
