# Test Level Selection & Priority

Two orthogonal questions, answered in order:

1. **What level?** — where in the stack the test lives.
2. **What priority?** — how much coverage the behavior earns.

Level answers "which harness". Priority answers "how many scenarios". Getting
level right and priority wrong produces either a bloated UI suite or a critical
path with one happy-path test.

## The level decision

Start at the bottom. Escalate only when the level below genuinely cannot observe
the behavior.

| Question                                                                          | If yes →                        | Reference                                |
| --------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------- |
| Is it a pure function, parser, predicate, or a branch in framework code?          | **Framework unit**              | [framework-code.md](framework-code.md)   |
| Is it the HTTP surface — status codes, error shapes, response schema, auth gates? | **API**                         | [api-and-schema.md](api-and-schema.md)   |
| Is it the wire format we depend on from a service we call?                        | **Contract** (Pact consumer)    | [contract-pact.md](contract-pact.md)     |
| Is it a flow a user performs across pages, with real auth and a real backend?     | **UI E2E**                      | [e2e-playwright.md](e2e-playwright.md)   |
| Is it the rendered appearance of a stable page?                                   | **Visual**                      | [visual-and-a11y.md](visual-and-a11y.md) |
| Is it an accessibility rule on a rendered page?                                   | **Accessibility**               | [visual-and-a11y.md](visual-and-a11y.md) |
| Is it throughput, latency under load, or an error rate at concurrency?            | **Performance** (k6)            | [performance.md](performance.md)         |
| Is it an exposed header, cookie flag, or passive security signal?                 | **Security** (passive baseline) | [security-zap.md](security-zap.md)       |

### What this stack does _not_ have

Say so plainly rather than inventing a level:

- **No component/render level.** There is no application front-end in this repo —
  the UI under test is a third-party site. A "component test" has nowhere to live.
- **No database or persistence level.** Nothing owns a datastore. "Assert the
  persisted state" is unavailable; the deepest observable boundary is the HTTP
  response plus its zod schema.
- **No real-device mobile level.** `mobile-chrome` and `mobile-safari` are
  Chromium/WebKit device _emulation_: viewport, user agent, touch. They do not
  cover native gestures, deep links, biometrics, or store payments.
- **No provider-side contract verification.** The Pact setup is consumer-only.
- **No integration level in the usual sense.** With no owned services to wire
  together, what would be an integration test elsewhere is an API test here.

### Escalation is a cost, not a virtue

Approximate feedback cost per level in this repo:

| Level          | Local                                   | CI                    | Verdict                  |
| -------------- | --------------------------------------- | --------------------- | ------------------------ |
| Framework unit | sub-second, no network                  | seconds               | Free. Add liberally      |
| API            | seconds, network-bound                  | own job, ~2 min       | Cheap. The workhorse     |
| Contract       | seconds, local mock server              | own job               | Cheap; narrow value      |
| UI E2E         | ~10 s per spec, needs a browser         | own job, `retries: 2` | Expensive, forever       |
| Visual         | needs a browser + matching OS baselines | **not gated**         | Expensive and OS-coupled |
| Accessibility  | needs a browser                         | own job               | Moderate                 |
| Performance    | minutes, hits a shared public API       | manual dispatch only  | Expensive; never gates   |

A new UI spec is a permanent tax on every pull request. Before adding one, ask:
_what does this catch that an API test plus a framework unit test cannot?_

Valid answers: routing and redirects, the real auth session round-trip,
cross-page state, the actual rendered page under real data, a browser-specific
defect.

Invalid answers: "the price calculation", "the error message text", "the sort
order", "the validation rule".

### Push-down heuristics

| Tempting UI E2E                              | Push down to                                                |
| -------------------------------------------- | ----------------------------------------------------------- |
| "Assert the cart total is correct"           | Framework unit on `sumPrices` / `parsePrice`                |
| "Assert the inventory list is sorted"        | Framework unit on `isSortedAscending`, or API on `sortBy`   |
| "Assert an unauthorized caller is blocked"   | API negative test                                           |
| "Assert the 404 message"                     | API test asserting status **and** the schema-parsed body    |
| "Assert the page didn't visually change"     | Visual project, not an E2E assertion                        |
| "Assert the retry logic backs off"           | Framework unit on `ApiClient` with a routed/stubbed context |
| "Assert the whole checkout happy path works" | Keep at UI E2E — this is what E2E is for                    |

## The priority decision

Priority sets the _scenario count_, not the level. Score two axes and take the
higher.

**Impact if it breaks:**

| Level    | Meaning                                                                 |
| -------- | ----------------------------------------------------------------------- |
| Critical | Auth is bypassed, a token leaks, money is computed wrong, data is lost  |
| High     | A core journey is blocked — login, add-to-cart, checkout, list-products |
| Medium   | A secondary feature degrades and a workaround exists                    |
| Low      | Cosmetic, or reached only by an unusual path                            |

**Probability of breaking:**

| Level  | Signals                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------- |
| High   | New code, complex branching, retry/timing logic, a boundary broken before, an area with no existing tests |
| Medium | Modified existing logic, moderate branching                                                               |
| Low    | Mechanical change, type-only, well-covered area                                                           |

|                | Impact Critical | High | Medium | Low |
| -------------- | --------------- | ---- | ------ | --- |
| **Prob. High** | P0              | P0   | P1     | P2  |
| **Medium**     | P0              | P1   | P1     | P3  |
| **Low**        | P0              | P1   | P2     | P3  |

Impact Critical is always P0 regardless of probability — that is deliberate. A
low-probability auth bypass is still a P0.

### P0 — Critical (comprehensive coverage, all applicable levels)

Criteria: security, correctness of money, data integrity, or a previously broken
path.

In this repo that means: the login flow both ways, token handling in
`authTokens`/`authedRequest`, `/auth/login` and `/auth/me` including negatives,
cart and checkout totals, the `ApiClient` retry path, `env` validation, and the
TARS engines that decide what runs and what gets quarantined — a wrong selection
silently skips tests, which is the worst failure mode available here.

Required scenarios:

- Happy path, asserting the observable result (status **and** schema-parsed body).
- Every error branch, with the specific status and message shape.
- Unauthenticated caller rejected.
- Boundary conditions on money, counts, and pagination.
- A regression test for each previously-shipped bug.

### P1 — High (happy path + key errors)

Core journeys and frequently-used surfaces: inventory listing and sorting, cart
add/remove, the menu, product detail, product search and pagination, cart and user
list endpoints.

Required: the primary happy path, the two or three error paths a caller will
actually hit, and the auth negative where the endpoint is scoped.

### P2 — Medium (happy path)

Secondary behavior: display formatting, the "continue shopping" path, field
selection on a list endpoint, sort-order variants beyond the first.

One happy path, plus an error path if the logic is non-trivial.

### P3 — Low (opportunistic)

Cosmetic behavior and rarely-reached branches. Cover only if free — widening an
existing test rather than adding one.

### Priority → level matrix

|        | Framework unit         | API                            | Contract                       | UI E2E                           |
| ------ | ---------------------- | ------------------------------ | ------------------------------ | -------------------------------- |
| **P0** | all branches           | required, incl. auth negatives | if the wire format is the risk | happy path + critical error path |
| **P1** | main branches          | happy + key errors             | rarely                         | happy path only, if user-facing  |
| **P2** | happy + obvious errors | happy path                     | no                             | no                               |
| **P3** | if trivial             | no                             | no                             | no                               |

Visual, accessibility, performance, and security are **not** priority-scaled the
same way — they are per-surface suites. Add a page to the visual or accessibility
suite when the page is stable and worth guarding; do not generate one scenario per
priority tier.

## Special cases

**Bug fix.** Write the regression test first, at the lowest level that reproduces
the bug. State in the summary that it fails on the old behavior. If you cannot make
it fail before the fix, you have not reproduced the bug — say so rather than
shipping a test that would have passed anyway.

**Refactor with no behavior change.** Do not add tests. If existing tests break,
that is either a real behavior change or the tests were asserting implementation.
Diagnose which; never "update" assertions to match new internals silently.

**New API endpoint or client method.** An API test is mandatory, including the auth
negative if the endpoint is scoped. Add a zod schema in the same change — an
endpoint without a schema is untyped at runtime, which defeats the pattern.

**New page object method.** No test of its own. It earns coverage through the spec
that uses it. A page object method with no caller is dead code.

**A defect in the third-party target.** Not a bug you can fix. Document it, and if
it would otherwise make a suite permanently red, baseline it explicitly so the
suite still fails on _new_ problems — the pattern used for the known WCAG
violation. Never blanket-ignore a whole rule class.

**Third-party dependency you don't own.** Do not test the third party. Test _our_
handling of its success, failure, and timeout — route or stub the boundary with
`page.route()` or a purpose-built `APIRequestContext`.

**Deferred coverage.** Legitimate when a scenario genuinely requires something the
harness cannot reach. Write the reachable negatives, and state the deferral with
its cause. Do not silently skip.

## Declaring the choice

When the level is ambiguous, one line is enough:

> Framework unit, not API — the defect is in `retryDelayMs`'s handling of a
> malformed `Retry-After` header, so a routed request context is the smallest
> thing that can observe it. An API test would need the live service to
> rate-limit us on demand, which it won't.

State it, then proceed. Do not open a discussion unless the tradeoff is genuinely
material.
