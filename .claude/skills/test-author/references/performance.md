# Performance & Scale

Two separate concerns, often confused:

1. **Load testing** — does the service hold up at concurrency? k6, out of band.
2. **Scale defects** — does our code do something that degrades as data grows?
   Observable without a load generator, and usually cheaper to catch.

## 1. Load testing with k6

### What exists

```
tests/dummyjson/performance/
  lib/config.ts      BASE_URL, shared thresholds, envInt()
  load.ts            steady expected traffic
  stress.ts          ramp past comfortable capacity
  spike.ts           sudden burst
  soak.ts            sustained duration
```

```bash
npm run perf:load     # k6 run tests/dummyjson/performance/load.ts
npm run perf:stress
npm run perf:spike
npm run perf:soak
```

Requires the `k6` binary (installed separately — `brew install k6`). It is **not** an
npm dependency, so `npm ci` does not provide it. If it is not installed, say you could
not execute the script rather than reporting a result.

### Thresholds are the assertion

This is the whole point. k6 measures whether you ask it to or not; **thresholds** are
what make a run pass or fail, because a breached threshold makes k6 exit non-zero.

```ts
export const thresholds: Options['thresholds'] = {
  http_req_failed: ['rate<0.01'], // error budget: under 1% of requests
  http_req_duration: ['p(95)<500'], // latency budget: p95 under 500ms
};
```

A script with no thresholds is a measurement, not a test. It cannot fail, so it
protects nothing. That is a review finding.

Choose percentiles, never averages. An average hides the tail that users actually
experience. `p(95)` is the floor for a meaningful budget; `p(99)` where the operation
is critical.

`stress.ts` and `spike.ts` deliberately run looser budgets than `load.ts` — the point
of a stress run is to find the breaking point, so holding it to steady-state latency
would fail by design and teach nothing.

### The TypeScript constraint — read before touching tsconfig

k6 v0.57+ runs TypeScript natively via esbuild, but **its module loader requires an
explicit `.ts` extension on local imports**:

```ts
import { BASE_URL, thresholds } from './lib/config.ts'; // .ts is REQUIRED
```

TypeScript only permits that with `allowImportingTsExtensions`, which itself requires
`noEmit`. Both are set in `tsconfig.json`, with a comment explaining why. That is
correct for this project independently — nothing is ever compiled to `dist/`; Playwright,
ts-jest, and k6 each transpile on their own.

So: **do not remove `allowImportingTsExtensions` or `noEmit`**, and do not "fix" the
`.ts` extensions in the performance scripts. Either change breaks one of the two
toolchains. `@types/k6` gives the scripts real types inside the `tsc` gate, which is
how a k6 script stays type-checked despite never being compiled.

### Configuration

`envInt(name, fallback)` reads a knob from k6's `__ENV` with a conservative default:

```bash
k6 run -e PEAK_VUS=200 tests/dummyjson/performance/stress.ts
```

Defaults are deliberately modest. **The target is a shared public API we do not own.**
Generating serious load against it is abusive, which is also why `performance.yml` is
`workflow_dispatch`-only and never scheduled. Raise the VU counts only against
infrastructure you control, and say so when you do.

### CI

`.github/workflows/performance.yml`, manual dispatch only, with a `choice` input
selecting which script to run. Uses `grafana/setup-k6-action@v1` and
`grafana/run-k6-action@v1`, and uploads `k6-summary.json` as an artifact. Never gates
a pull request.

### If asked to gate performance in CI

Push back, and explain the two reasons in order:

1. **The target.** Automated recurring load against a third-party service is not ours
   to generate. This is the blocking objection and it does not have a workaround.
2. **The signal.** Latency measured from a shared GitHub runner over the public
   internet has enormous variance. A p95 gate on that measurement fails on runner
   noise and teaches the team to ignore it.

A performance gate is meaningful against infrastructure you own, on a stable runner,
with a baseline built from history. Offer that framing rather than a threshold nobody
will trust.

## 2. Scale defects — testable without a load generator

Most damage attributed to "performance" is a scale defect: work that grows with the
data. These are cheap to catch at the API or framework-unit level, and a load test is
the _wrong_ tool for them because it tells you something is slow without telling you
why.

### Unbounded reads

A list endpoint consumed without pagination works fine on 30 rows and falls over on
30,000.

```ts
// Assert the contract actually bounds the response
const body = productListSchema.parse(await response.json());
expect(body.products.length).toBeLessThanOrEqual(body.limit);
expect(body.limit).toBeLessThanOrEqual(100);
```

Where our own code walks a paginated resource, assert it respects `limit` and
terminates. A loop with no bound is a defect regardless of today's dataset size.

### Fan-out

One logical operation issuing N requests. Observable by counting requests rather than
timing them:

```ts
let requestCount = 0;
page.on('request', (r) => {
  if (r.url().includes('/products')) requestCount += 1;
});

await inventoryPage.goto();

expect(requestCount).toBeLessThanOrEqual(2);
```

Counting is deterministic; timing is not. Prefer it every time.

### Retry amplification

`ApiClient` retries transient statuses up to `MAX_RETRIES` with backoff. A caller that
adds its own retry on top multiplies the load — 3 × 3 = 9 requests where the service
is already struggling. Worth a framework-unit test where retry behavior matters; see
[framework-code.md](framework-code.md).

### Never do these

| Anti-pattern                                                    | Why                                                        | Instead                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `expect(duration).toBeLessThan(200)` in a functional test       | Fails on a loaded runner, passes on a fast one. Pure noise | Count requests, or move it to k6 with a threshold          |
| A k6 script with no thresholds                                  | Cannot fail; protects nothing                              | Add thresholds                                             |
| Asserting on an average                                         | Hides the tail users feel                                  | `p(95)` or `p(99)`                                         |
| Raising a threshold to make a run pass                          | Erases the signal you built                                | Diagnose the regression, or state the new baseline and why |
| Running `stress`/`soak` against the public target on a schedule | Abusive to a service we don't own                          | Manual dispatch, modest defaults                           |
| Reporting a k6 result you didn't run                            | The binary may not be installed                            | Say you could not execute it                               |

## CI resource budgets

`ubuntu-latest`: 4 vCPU, 16 GB RAM, and the browser download dominates job time.

| Constraint                     | Consequence                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `workers: 1` on CI             | Runs are serial. The largest single lever on CI duration in this repo           |
| No browser cache configured    | Every job re-downloads Chromium                                                 |
| `timeout-minutes` 5–30 per job | A hung browser fails the job instead of burning the budget                      |
| 4 vCPU                         | Playwright's default worker count is CPU-derived; more workers than cores hurts |

Raising `workers` above 1 trades determinism against a shared third-party target for
wall-clock. That is a real tradeoff with a real downside — more concurrent load on a
service we don't own, and more scope for cross-test interference against a target
whose rate limiting we cannot see. If you propose it, propose the number and the
reasoning, not just the change.

## Verify

```bash
k6 version                                          # is it even installed?
npm run perf:load                                   # full run with thresholds
k6 run --vus 1 --duration 5s tests/dummyjson/performance/load.ts   # smoke the script
npm run typecheck                                   # the scripts are inside the tsc gate
```

A k6 run against the public target takes minutes and generates real traffic. Smoke the
script with 1 VU for 5 seconds when you only need to prove it parses and runs.
