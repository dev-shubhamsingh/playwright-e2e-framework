import http from 'k6/http';
import { check, sleep } from 'k6';
import { type Options } from 'k6/options';
import { BASE_URL, envInt } from './lib/config.ts';

/**
 * Spike test — a sudden burst of traffic, then a drop back to baseline.
 *
 * Validates how the API copes with an abrupt surge (e.g. a flash sale) and,
 * just as importantly, whether it *recovers* once the spike subsides.
 */
const SPIKE_VUS = envInt('SPIKE_VUS', 100);
const BASELINE_VUS = envInt('SPIKE_BASELINE_VUS', 10);

export const options: Options = {
  stages: [
    { duration: '20s', target: BASELINE_VUS }, // warm up
    { duration: '15s', target: SPIKE_VUS }, // sudden spike
    { duration: '20s', target: BASELINE_VUS }, // recover
    { duration: '10s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.20'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function (): void {
  const res = http.get(`${BASE_URL}/products?limit=10`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
