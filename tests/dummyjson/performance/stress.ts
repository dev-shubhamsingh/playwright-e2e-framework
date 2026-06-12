import http from 'k6/http';
import { check, sleep } from 'k6';
import { type Options } from 'k6/options';
import { BASE_URL, envInt } from './lib/config.ts';

/**
 * Stress test — ramp load progressively beyond the expected peak to find the
 * point where latency degrades or errors climb (the breaking point).
 *
 * Thresholds are looser than the load test: the goal is to observe behaviour
 * under strain, not to assert a tight budget. We still fail the run if errors
 * become severe (> 15%), which signals an outright collapse rather than
 * graceful degradation.
 */
const PEAK_VUS = envInt('PEAK_VUS', 60);

export const options: Options = {
  stages: [
    { duration: '1m', target: Math.round(PEAK_VUS / 2) }, // ramp to normal
    { duration: '2m', target: PEAK_VUS }, // push beyond
    { duration: '1m', target: 0 }, // recover
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function (): void {
  const res = http.get(`${BASE_URL}/products?limit=10`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
