/**
 * General-purpose test helpers — pure, framework-agnostic utilities.
 *
 * Keep these small and side-effect free so they're trivial to reason about
 * and reuse across specs.
 */

/**
 * Parse a price string like "$29.99" into a number (29.99).
 * Returns NaN-safe 0 if the string has no parseable number.
 */
export function parsePrice(raw: string): number {
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Sum an array of numbers, rounded to 2 decimals to avoid
 * floating-point drift (0.1 + 0.2 !== 0.3 problem).
 */
export function sumPrices(prices: number[]): number {
  const total = prices.reduce((acc, p) => acc + p, 0);
  return roundTo(total, 2);
}

/**
 * Round a number to a fixed number of decimal places.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Returns true if an array is sorted ascending.
 */
export function isSortedAscending<T>(arr: T[]): boolean {
  return arr.every((val, i) => i === 0 || arr[i - 1] <= val);
}

/**
 * Returns true if an array is sorted descending.
 */
export function isSortedDescending<T>(arr: T[]): boolean {
  return arr.every((val, i) => i === 0 || arr[i - 1] >= val);
}

/**
 * Returns true if an array of strings is in alphabetical order.
 */
export function isAlphabetical(arr: string[]): boolean {
  const sorted = [...arr].sort((a, b) => a.localeCompare(b));
  return JSON.stringify(arr) === JSON.stringify(sorted);
}
