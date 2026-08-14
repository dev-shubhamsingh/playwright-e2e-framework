import { test, expect } from '@playwright/test';
import {
  fold,
  keyOf,
  type QuarantineEntry,
} from '../../../tars/engine/quarantine';

/**
 * Framework unit tests for the auto-quarantine fold.
 *
 * `fold` is pure and takes `now` as a parameter, so every assertion is on an
 * exact value rather than a moving clock.
 */

const NOW = '2026-08-14T12:00:00.000Z';
const EARLIER = '2026-01-01T00:00:00.000Z';

function entry(overrides: Partial<QuarantineEntry> = {}): QuarantineEntry {
  return {
    project: 'authenticated',
    title: 'a flaky test',
    flakeCount: 1,
    firstSeen: EARLIER,
    lastSeen: EARLIER,
    ...overrides,
  };
}

test.describe('keyOf', { tag: '@regression' }, () => {
  test('keys on project and title together', () => {
    expect(keyOf({ project: 'api', title: 'x' })).not.toBe(
      keyOf({ project: 'webkit', title: 'x' }),
    );
  });

  test('uses a separator that cannot occur in a test title', () => {
    // U+241F (unit separator symbol) — a plain ':' or '-' would let
    // ('a', 'b:c') and ('a:b', 'c') collide into one ledger entry.
    expect(keyOf({ project: 'a', title: 'b' })).toBe('a␟b');
  });
});

test.describe('fold — new entries', { tag: '@regression' }, () => {
  test('appends an unseen flake with count 1 and equal timestamps', () => {
    const result = fold([], [{ project: 'api', title: 'flaky one' }], NOW);

    expect(result.ledger).toEqual([
      {
        project: 'api',
        title: 'flaky one',
        flakeCount: 1,
        firstSeen: NOW,
        lastSeen: NOW,
      },
    ]);
    expect(result.added).toEqual(['flaky one']);
    expect(result.updated).toEqual([]);
  });

  test('treats the same title in two projects as two entries', () => {
    const result = fold(
      [],
      [
        { project: 'authenticated', title: 'same name' },
        { project: 'webkit', title: 'same name' },
      ],
      NOW,
    );

    expect(result.ledger).toHaveLength(2);
    expect(result.added).toHaveLength(2);
  });
});

test.describe('fold — repeat offenders', { tag: '@regression' }, () => {
  test('increments the count and moves lastSeen, preserving firstSeen', () => {
    const existing = [entry({ flakeCount: 3 })];

    const result = fold(
      existing,
      [{ project: 'authenticated', title: 'a flaky test' }],
      NOW,
    );

    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0].flakeCount).toBe(4);
    expect(result.ledger[0].lastSeen).toBe(NOW);
    // firstSeen is the whole point of the ledger — it tells you how long this
    // has been rotting. Overwriting it would erase the history.
    expect(result.ledger[0].firstSeen).toBe(EARLIER);
    expect(result.updated).toEqual(['a flaky test']);
    expect(result.added).toEqual([]);
  });

  test('does not mutate the ledger it was given', () => {
    // The CLI writes the returned value; a mutating fold would make the
    // function unsafe to call twice and hard to reason about under test.
    const existing = [entry({ flakeCount: 3 })];

    fold(existing, [{ project: 'authenticated', title: 'a flaky test' }], NOW);

    expect(existing[0].flakeCount).toBe(3);
    expect(existing[0].lastSeen).toBe(EARLIER);
  });
});

test.describe('fold — ordering and empty input', { tag: '@regression' }, () => {
  test('sorts the ledger by flake count, worst first', () => {
    const existing = [
      entry({ title: 'mild', flakeCount: 1 }),
      entry({ title: 'severe', flakeCount: 9 }),
      entry({ title: 'moderate', flakeCount: 4 }),
    ];

    const result = fold(existing, [], NOW);

    expect(result.ledger.map((e) => e.title)).toEqual([
      'severe',
      'moderate',
      'mild',
    ]);
  });

  test('leaves the ledger unchanged when nothing flaked', () => {
    const existing = [entry({ flakeCount: 2 })];

    const result = fold(existing, [], NOW);

    expect(result.ledger).toEqual(existing);
    expect(result.added).toEqual([]);
    expect(result.updated).toEqual([]);
  });

  test('returns an empty ledger for empty inputs', () => {
    const result = fold([], [], NOW);

    expect(result.ledger).toEqual([]);
  });

  test('counts a test that flaked twice in one run as two increments', () => {
    // Playwright records one result per test, so this should not normally occur
    // — but the fold must be well-defined if it does, rather than silently
    // dropping the duplicate.
    const result = fold(
      [],
      [
        { project: 'api', title: 'dup' },
        { project: 'api', title: 'dup' },
      ],
      NOW,
    );

    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0].flakeCount).toBe(2);
    expect(result.added).toEqual(['dup']);
    expect(result.updated).toEqual(['dup']);
  });
});
