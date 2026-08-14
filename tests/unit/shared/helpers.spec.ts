import { test, expect } from '@playwright/test';
import {
  parsePrice,
  sumPrices,
  roundTo,
  isSortedAscending,
  isSortedDescending,
  isAlphabetical,
} from '@shared/utils';

/**
 * Framework unit tests for the shared helpers.
 *
 * These are pure functions with no dependencies, so they need no fixtures and
 * no browser. They are also load-bearing: `parsePrice` is used by four page
 * objects and `sumPrices` backs the checkout total assertions, so a silent
 * regression here would surface as a confusing UI failure somewhere else.
 */

test.describe('parsePrice', { tag: '@regression' }, () => {
  test('extracts a decimal price from a currency string', () => {
    expect(parsePrice('$29.99')).toBe(29.99);
  });

  test('extracts a price with no decimal part', () => {
    expect(parsePrice('$7')).toBe(7);
  });

  test('extracts a price embedded in surrounding text', () => {
    expect(parsePrice('Total: $15.49 (inc. tax)')).toBe(15.49);
  });

  test('returns 0 for a string containing no number', () => {
    // Documented contract: NaN-safe, so a caller can sum results unguarded.
    expect(parsePrice('free')).toBe(0);
  });

  test('returns 0 for an empty string', () => {
    expect(parsePrice('')).toBe(0);
  });

  test('takes the first number when several are present', () => {
    expect(parsePrice('$9.99 was $19.99')).toBe(9.99);
  });
});

test.describe('sumPrices', { tag: '@regression' }, () => {
  test('sums to two decimals without floating-point drift', () => {
    // This case is the reason the function exists — 0.1 + 0.2 is 0.30000000000000004
    // in IEEE-754, and asserting a cart total against that fails.
    expect(sumPrices([0.1, 0.2])).toBe(0.3);
  });

  test('sums a realistic cart', () => {
    expect(sumPrices([29.99, 9.99, 15.99])).toBe(55.97);
  });

  test('returns 0 for an empty array', () => {
    expect(sumPrices([])).toBe(0);
  });

  test('rounds a third decimal place away', () => {
    expect(sumPrices([1.005, 1.005])).toBe(2.01);
  });
});

test.describe('roundTo', { tag: '@regression' }, () => {
  test('rounds to the requested number of decimals', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
  });

  test('rounds to zero decimals', () => {
    expect(roundTo(2.6, 0)).toBe(3);
  });

  test('rounds an exactly-representable .5 boundary upward', () => {
    // Math.round is half-up for positive values, and 2.5 is exact in IEEE-754.
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(0.5, 0)).toBe(1);
  });

  test('rounds a non-representable .5 boundary by its actual float value', () => {
    // Documented limitation, not a defect to "fix" naively. 1.255 cannot be
    // represented exactly: 1.255 * 100 === 125.49999999999999, so Math.round
    // takes it *down* to 1.25 — half-up on the stored value, which is below the
    // boundary. Pinned because the intuitive expectation (1.26) is wrong, and
    // anyone touching this function will reach for it.
    expect(1.255 * 100).toBeLessThan(125.5);
    expect(roundTo(1.255, 2)).toBe(1.25);

    // The counterpart that does land above the boundary rounds up as expected.
    expect(roundTo(1.245 + 0.01, 2)).toBe(1.26);
  });

  test('leaves an already-short value unchanged', () => {
    expect(roundTo(5, 2)).toBe(5);
  });
});

test.describe('sort predicates', { tag: '@regression' }, () => {
  test('isSortedAscending accepts an ascending array', () => {
    expect(isSortedAscending([1, 2, 3])).toBe(true);
  });

  test('isSortedAscending rejects an unsorted array', () => {
    expect(isSortedAscending([3, 1, 2])).toBe(false);
  });

  test('isSortedDescending accepts a descending array', () => {
    expect(isSortedDescending([3, 2, 1])).toBe(true);
  });

  test('isSortedDescending rejects an unsorted array', () => {
    expect(isSortedDescending([1, 3, 2])).toBe(false);
  });

  test('both predicates accept an empty array and a single element', () => {
    expect(isSortedAscending([])).toBe(true);
    expect(isSortedDescending([])).toBe(true);
    expect(isSortedAscending([1])).toBe(true);
    expect(isSortedDescending([1])).toBe(true);
  });

  test('equal adjacent elements satisfy both predicates', () => {
    // Both use non-strict comparisons, so a plateau is neither strictly
    // ascending nor strictly descending but satisfies both. That is intended —
    // two products at the same price must not fail a sort assertion. Pinned so
    // tightening to strict comparison would be a deliberate choice.
    expect(isSortedAscending([1, 1, 2])).toBe(true);
    expect(isSortedDescending([2, 1, 1])).toBe(true);
    expect(isSortedAscending([1, 1])).toBe(true);
    expect(isSortedDescending([1, 1])).toBe(true);
  });

  test('the predicates work on strings by code-unit order', () => {
    expect(isSortedAscending(['a', 'b', 'c'])).toBe(true);
    expect(isSortedAscending(['B', 'a'])).toBe(true); // 'B'(66) < 'a'(97)
  });
});

test.describe('isAlphabetical', { tag: '@regression' }, () => {
  test('accepts an alphabetically ordered array', () => {
    expect(isAlphabetical(['apple', 'banana', 'cherry'])).toBe(true);
  });

  test('rejects an out-of-order array', () => {
    expect(isAlphabetical(['cherry', 'apple'])).toBe(false);
  });

  test('accepts an empty array and a single element', () => {
    expect(isAlphabetical([])).toBe(true);
    expect(isAlphabetical(['only'])).toBe(true);
  });

  test('disagrees with isSortedAscending on mixed case', () => {
    // This divergence is load-bearing, not a bug. isAlphabetical uses
    // localeCompare (case-insensitive-ish collation); isSortedAscending compares
    // UTF-16 code units. The products API sorts by code unit, and
    // products.spec.ts deliberately asserts against `[...titles].sort()` to
    // match the server. Pinning both stops someone "unifying" them and silently
    // breaking that suite.
    const mixed = ['Banana', 'apple'];

    expect(isSortedAscending(mixed)).toBe(true);
    expect(isAlphabetical(mixed)).toBe(false);
  });
});
