import http from 'k6/http';
import { check, sleep } from 'k6';
import { type Options } from 'k6/options';
import { BASE_URL, thresholds, envInt } from './lib/config.ts';

/**
 * Load test — baseline behaviour under expected, sustained traffic.
 *
 * Ramps to a steady number of virtual users, holds, then ramps down. Answers:
 * "does the API meet its latency/error budget under normal load?"
 */
const VUS = envInt('LOAD_VUS', 20);

export const options: Options = {
  stages: [
    { duration: '30s', target: VUS }, // ramp up
    { duration: '1m', target: VUS }, // steady state
    { duration: '30s', target: 0 }, // ramp down
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
