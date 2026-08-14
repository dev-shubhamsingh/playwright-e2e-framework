---
name: test-plan
description: Produce a risk-scored test plan or coverage audit for a change in this Playwright + TypeScript repository, before any test is written. Reads a diff, branch, or pull request; enumerates the behaviors at risk; scores each P0-P3 by probability and impact; assigns a test level and a concrete file location to each scenario; and reports what is already covered versus what is a gap, including false coverage. Use when the user asks what should be tested, for a test plan, a test strategy, a coverage audit, a coverage gap analysis, "what's missing", "what should I test for this change", or whether a change is adequately covered before merge.
compatibility: Requires this Playwright + TypeScript repository (package name `tars`). Needs git history for diff analysis and the `gh` CLI for pull-request context. Writes no tests and runs no suites — planning only.
license: MIT
allowed-tools: Read Grep Glob Bash(git *) Bash(gh pr *) Bash(gh run list *) Bash(rg *) Bash(npm run tars:select) Bash(npx tsx tars/engine/select.ts *)
disallowed-tools: Edit Write NotebookEdit
metadata:
  author: Shubham Singh
  version: '2.0'
  canon: tars/persona.md, tars/architecture.md, tars/test-patterns.md
---

# Test Plan — Coverage Audit & Test Design

Planning mode: **no tests are written here**, and no suite is run. Answer the question a
staff SDET gets asked before the work starts — _what is worth testing, at what level, and
what already covers it?_

The output is a decision document a reviewer can argue with. Vagueness is the failure
mode — "add more tests" is not a plan. Every row must name a behavior, a level, a
location, and a priority.

Be direct and specific, and be willing to say "this needs nothing". Lead with the verdict,
then the table, then the reasoning.

Hand off to `test-author` to write the tests once the plan is agreed.

## Step 0 — Establish scope

Ask only if you cannot determine it. Otherwise infer and state your inference.

| Input available                      | How to scope                                                      |
| ------------------------------------ | ----------------------------------------------------------------- |
| A diff or branch                     | `git diff <base>...HEAD --stat`, then per-file diffs              |
| A pull-request number                | `gh pr view <n> --json title,body,files` and `gh pr diff <n>`     |
| A feature description only           | Scope to the described behavior; state what you assumed           |
| A file or directory                  | Scope to it, and note what it depends on that you are excluding   |
| Nothing specific ("audit our tests") | Too broad. Narrow it to a domain, a level, or a diff, and say why |

`npm run tars:select` gives you the repo's own view of which specs a diff affects — a
useful cross-check on your scope, and a defensible way to justify the boundary you drew.
Treat it as a claim to verify, not gospel; its mapping is domain-level and coarse.

Then establish **domain and test type** — the two axes everything else follows from:

| Signal                                    | Domain            | Types available                  |
| ----------------------------------------- | ----------------- | -------------------------------- |
| Pages, flows, clicks, page objects        | `saucedemo` (UI)  | `e2e`, `visual`, `a11y`          |
| Endpoints, clients, schemas, status codes | `dummyjson` (API) | `api`, `contract`, `performance` |
| Helpers, `ApiClient`, `env`, TARS engines | framework code    | the unit level                   |

Read [test-author/references/stack-map.md](../test-author/references/stack-map.md) for
the full topology.

## Step 1 — Enumerate behaviors at risk

Read the change. For each changed unit, list the **behaviors** — not the files, not the
functions. A behavior is something a caller or user can observe.

Work through five lenses. Each is a different failure class; skipping one is how gaps
happen.

| Lens            | Ask                                                                             | Typical findings here                                                          |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Happy path**  | What is this supposed to do?                                                    | The primary flow, per input variant                                            |
| **Boundaries**  | Empty, zero, one, max, negative, duplicate, unicode                             | Off-by-one, unhandled empty collection, pagination edges, float drift in money |
| **Error paths** | What happens when the target fails, times out, or returns something unexpected? | Swallowed errors, a retry that never terminates, an unparsed body              |
| **Auth**        | Who is allowed to do this? Who is not?                                          | A missing unauthenticated negative, a token assumed present                    |
| **Scale**       | What happens at 100× the data?                                                  | Unbounded reads, fan-out, retry amplification                                  |

The auth lens is **not optional** on any endpoint that takes a token. An endpoint whose
only coverage is the happy path is a P0 gap if it is scoped at all.

Where the change is in framework code, add a sixth question: **what breaks silently?**
`tars/engine/select.ts` returning the wrong answer skips tests without failing anything.
That class of defect outranks almost everything else in this repo.

## Step 2 — Score each behavior

Priority = what coverage the behavior earns. Use the P0–P3 model in
[test-author/references/test-levels.md](../test-author/references/test-levels.md).

Score from two axes, then take the higher.

**Impact if it breaks:**

| Level    | Meaning here                                                                |
| -------- | --------------------------------------------------------------------------- |
| Critical | Auth bypassed, a token leaked, money computed wrong, tests silently skipped |
| High     | A core journey blocked — login, add-to-cart, checkout, list-products        |
| Medium   | A secondary feature degrades; a workaround exists                           |
| Low      | Cosmetic, or reached only by an unusual path                                |

**Probability of breaking:**

| Level  | Signals                                                                            |
| ------ | ---------------------------------------------------------------------------------- |
| High   | New code, complex branching, retry or timing logic, an area with no existing tests |
| Medium | Modified existing logic, moderate branching                                        |
| Low    | Mechanical change, type-only, well-covered area                                    |

|                | Impact Critical | High | Medium | Low |
| -------------- | --------------- | ---- | ------ | --- |
| **Prob. High** | P0              | P0   | P1     | P2  |
| **Medium**     | P0              | P1   | P1     | P3  |
| **Low**        | P0              | P1   | P2     | P3  |

Impact Critical is always P0 regardless of probability — deliberately. A low-probability
auth bypass is still a P0.

## Step 3 — Assign a level and a location

Use the smallest level that can observe the behavior. Record the **concrete location**,
not just the level name — "unit" is not actionable; `tests/unit/tars/select.spec.ts` is.

Escalate only when the level below genuinely cannot see it, and **record the reason when
you escalate**, because that is the row a reviewer will question.

Be explicit when the honest answer is that no level here can reach it: there is no
component level, no database level, no real-device mobile, and no provider-side contract
verification. Say that rather than inventing a row.

## Step 4 — Check what already covers it

This is the step that separates a plan from a wish list. For each scenario, search for
existing coverage before calling it a gap.

```bash
# UI behavior
rg -n "<behavior or method name>" tests/saucedemo
rg -ln "<page object method>" tests/saucedemo/e2e

# API behavior
rg -n "<endpoint path>" tests/dummyjson/api
rg -n "<schemaName>" tests/dummyjson tests/saucedemo

# Contract interactions
rg -n "<endpoint path>" tests/dummyjson/contract

# Is the framework function exercised anywhere at all?
rg -n "parsePrice|sumPrices|isSortedAscending" tests/ src/

# Which project would even run it?
rg -n "testMatch|testDir|testIgnore" playwright.config.ts
```

Classify each scenario:

| Status                | Meaning                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| ✅ **Covered**        | An existing test asserts this behavior. Cite `file:line`                                                  |
| ◑ **Partial**         | A test touches it but asserts the wrong thing, or only one branch. Say what's missing                     |
| ❌ **Gap**            | Nothing covers it                                                                                         |
| ⚠️ **False coverage** | A test exists and looks like coverage but isn't. Cite it — this is worse than a gap, because it hides one |

### Look for false coverage deliberately

Specific things to check in this repo:

- **`test.skip` / `test.only`** in the relevant file. `forbidOnly` catches `.only` in CI
  but not locally, where it silently skips every sibling.
- **A spec no project matches.** Check the path against the `testMatch` / `testDir` globs
  in `playwright.config.ts`. A spec outside them never runs — see
  [ci-gates.md](../test-author/references/ci-gates.md).
- **A spec in `UI_TEST_IGNORE`** assumed to have cross-browser coverage. It doesn't.
- **Anything under `tests/saucedemo/visual/`** described as CI coverage. The `visual`
  project is **not gated** — macOS-only baselines.
- **Framework code assumed covered by `typecheck`.** Compilation is not behavior. As of
  this writing, `src/core/`, `src/shared/`, `tars/engine/`, and `tars/reporter/` have
  **zero** behavioral coverage; Jest matches `**/*.pact.ts` only.
- **A status assertion with no schema parse, or a parse with no status assertion.** Each
  passes while the other half is broken.
- **A Pact chain that is never awaited** — green without running the interaction.
- **A response assertion presented as proof a write persisted.** Writes are simulated
  against the target; nothing persists, so no test can prove it did.
- **A k6 script with no thresholds.** It measures; it cannot fail.
- **A blanket accessibility ignore** rather than a per-page, per-rule baseline.

## Step 5 — Report

Lead with the verdict in one or two sentences, then the table.

### Format

```markdown
## Verdict

<One or two sentences: is this change adequately covered? What is the single biggest
gap? Any blocking finding?>

## Scope

- Branch / pull request / files in scope (count, and the ones that matter)
- Domain and test types in play
- Anything explicitly out of scope, and why

## Coverage plan

| #   | Behavior                                    | Pri | Level  | Location                               | Status     | Notes                                                                |
| --- | ------------------------------------------- | --- | ------ | -------------------------------------- | ---------- | -------------------------------------------------------------------- |
| 1   | Malformed Retry-After falls back to backoff | P0  | Unit   | `tests/unit/core/api-client.spec.ts`   | ❌ Gap     | No runner exists yet — see framework-code.md                         |
| 2   | Unauthenticated caller rejected on /auth/me | P0  | API    | `tests/dummyjson/api/auth.spec.ts`     | ✅ Covered | `auth.spec.ts:41`                                                    |
| 3   | Cart total sums to 2dp                      | P1  | Unit   | `tests/unit/shared/helpers.spec.ts`    | ⚠️ False   | Asserted only through the UI spec, which cannot isolate the rounding |
| 4   | Checkout happy path                         | P1  | UI E2E | `tests/saucedemo/e2e/checkout.spec.ts` | ✅ Covered | `checkout.spec.ts:22`                                                |

## Findings (not test gaps)

<Design problems, silent-failure risks, docs that contradict the code, defects in the
third-party target. Each with file:line and a proposed fix. Say plainly that these are
code or documentation problems, not coverage problems.>

## Recommended order

1. <P0 gaps first, cheapest level first>

## Deliberately not covering

| Behavior                              | Why                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Persisted state after POST /users/add | Writes are simulated by the target; there is nothing to re-read. Response shape covered instead |

## Cost note

<Which CI jobs this adds to and roughly what it costs. Call out any new UI spec — it
taxes every pull request forever. Note anything that would need a new project or a new
job to run at all.>
```

### Rules for the report

- **Every gap gets a location.** If you cannot name the file it belongs in, the plan is
  not finished.
- **Cite covered claims** as `file:line`, never "I think this is tested".
- **Separate findings from gaps.** A silent-failure risk in a selection rule is a design
  defect that happens to also be a coverage gap. Report it as the former.
- **Say what you are not covering, and why.** A plan with no deferrals usually didn't look
  hard.
- **Recommend an order** — cheapest and highest-priority first. A P0 framework unit test
  beats a P1 UI spec every time.
- **Price the UI spec.** If the plan adds one, say it joins the gated `test-ui` job on
  every pull request and should get a burn-in before merge.
- **Flag work that needs infrastructure first.** A framework unit test cannot run until a
  `unit` project exists. Saying "write the test" without that is a plan that cannot be
  executed.
- **If the change needs no new tests, say so.** A type-only refactor in a covered area is
  a legitimate "nothing needed". Explain why; don't invent work.

## Judgment calls

- **"Audit our whole test suite."** Too broad to be useful. Offer a scoped alternative —
  one domain, one level, the last N commits, or the P0 surface (auth, money, the engines
  that decide what runs). Pick one and say why.
- **A P0 behavior with no coverage and no way to run a test for it.** Lead with that. It
  outranks the rest of the plan.
- **A change that is mostly documentation.** Scope to the code, and say you did. If the
  docs make a claim the code does not support, that is a finding.
- **Acceptance criteria that aren't testable** ("should be fast", "should feel polished").
  Say they aren't testable as written and propose a measurable restatement, or mark them
  out of scope.
- **The change is a revert.** The plan is: does the test added alongside the original
  change also need reverting, and is there now a gap where it was?
- **Coverage-percentage requests.** Nothing in this repo gates on coverage, and no
  coverage tool is configured. Don't quote a threshold as if it were enforced — talk about
  behaviors, not percentages.
- **The behavior belongs to the third-party target, not to us.** Testing that
  `GET /products` returns products tests DummyJSON. Scope to _our_ handling of it and say
  so.
