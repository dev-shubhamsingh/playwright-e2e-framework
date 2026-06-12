import { type Options } from 'k6/options';

// Shared config for the k6 performance suite.
//
// k6 runs TypeScript natively (v0.57+), stripping types at run time; static
// type-checking comes from the project's `tsc --noEmit` via `@types/k6`.
// Scripts use k6's module syntax and the `__ENV` global for configuration.

/** Base URL — overridable so the same scripts can target a local/staging API. */
export const BASE_URL: string = __ENV.API_BASE_URL || 'https://dummyjson.com';

/**
 * Shared pass/fail thresholds. A k6 run exits non-zero if any threshold is
 * breached, which is what makes these usable as CI gates.
 *   - http_req_failed: error budget (< 1% of requests may fail)
 *   - http_req_duration: p95 latency budget (< 500ms)
 */
export const thresholds: Options['thresholds'] = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

/**
 * Read a VU/duration knob from env with a conservative default. DummyJSON is a
 * shared public API, so defaults are deliberately modest — bump via env when
 * targeting infrastructure you own:
 *   k6 run -e PEAK_VUS=200 tests/dummyjson/performance/stress.ts
 */
export function envInt(name: string, fallback: number): number {
  const raw = __ENV[name];
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
