import http from 'k6/http';
import { check, sleep } from 'k6';
import { type Options } from 'k6/options';
import { BASE_URL, thresholds, envInt } from './lib/config.ts';

/**
 * Soak test — sustained, moderate load held over a long period.
 *
 * Surfaces problems that only appear with time: memory leaks, resource
 * exhaustion, connection-pool starvation, gradual latency creep. The default
 * "soak" window here is compressed for a portfolio demo; against a real system
 * you would hold for hours (override via SOAK_DURATION).
 */
const VUS = envInt('SOAK_VUS', 20);
const SOAK_DURATION = __ENV.SOAK_DURATION || '5m';

export const options: Options = {
  stages: [
    { duration: '1m', target: VUS }, // ramp up
    { duration: SOAK_DURATION, target: VUS }, // hold
    { duration: '1m', target: 0 }, // ramp down
  ],
  thresholds,
};

export default function (): void {
  const res = http.get(`${BASE_URL}/products?limit=10`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'returns products': (r) => Array.isArray(r.json('products')),
  });
  sleep(1);
}
