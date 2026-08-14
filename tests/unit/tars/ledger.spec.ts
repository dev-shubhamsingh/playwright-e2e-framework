import { test, expect } from '@playwright/test';
import {
  atOrAbove,
  grepInvertPattern,
  renderSummary,
  readLedger,
} from '../../../tars/engine/ledger';
import type { QuarantineEntry } from '../../../tars/engine/quarantine';

/**
 * Framework unit tests for the quarantine ledger consumer.
 *
 * This is the piece that turns the ledger from a record into an action, so its
 * failure modes are consequential: a wrong grep pattern could skip the entire
 * suite, and a crash on a corrupt ledger could break a pipeline.
 */

function entry(overrides: Partial<QuarantineEntry> = {}): QuarantineEntry {
  return {
    project: 'authenticated',
    title: 'a flaky test',
    flakeCount: 1,
    firstSeen: '2026-01-01T00:00:00.000Z',
    lastSeen: '2026-08-14T00:00:00.000Z',
    ...overrides,
  };
}

test.describe('atOrAbove', { tag: '@regression' }, () => {
  test('selects entries at or above the threshold, inclusive', () => {
    const ledger = [
      entry({ title: 'one', flakeCount: 1 }),
      entry({ title: 'three', flakeCount: 3 }),
      entry({ title: 'five', flakeCount: 5 }),
    ];

    expect(atOrAbove(ledger, 3).map((e) => e.title)).toEqual(['three', 'five']);
  });

  test('returns nothing for an empty ledger', () => {
    expect(atOrAbove([], 1)).toEqual([]);
  });
});

test.describe('grepInvertPattern', { tag: '@regression' }, () => {
  test('returns an empty string for no entries', () => {
    // Critical: an empty --grep-invert pattern matches EVERYTHING, which would
    // skip the whole suite. Returning '' lets the caller detect the no-op case
    // instead of silently disabling every test.
    expect(grepInvertPattern([])).toBe('');
  });

  test('joins titles with an alternation', () => {
    const pattern = grepInvertPattern([
      entry({ title: 'first test' }),
      entry({ title: 'second test' }),
    ]);

    expect(pattern).toBe('first test|second test');
  });

  test('escapes regex metacharacters in a title', () => {
    // Test titles routinely contain parentheses and dots. Unescaped, a title
    // like 'logs in (within timeout)' becomes a capture group and stops matching
    // the test it is meant to exclude.
    const pattern = grepInvertPattern([
      entry({ title: 'logs in (within timeout)' }),
    ]);

    expect(pattern).toBe('logs in \\(within timeout\\)');
    expect(new RegExp(pattern).test('logs in (within timeout)')).toBe(true);
  });

  test('escapes every metacharacter it claims to', () => {
    const pattern = grepInvertPattern([
      entry({ title: 'a.b*c+d?e^f$g{h}i|j[k]l' }),
    ]);

    // The pattern must match its own source title literally.
    expect(new RegExp(pattern).test('a.b*c+d?e^f$g{h}i|j[k]l')).toBe(true);
    // And must NOT match a string that only satisfies the unescaped form.
    expect(new RegExp(pattern).test('aXbccdefgh i j k l')).toBe(false);
  });
});

test.describe('renderSummary', { tag: '@regression' }, () => {
  test('reports an empty ledger as a clean result', () => {
    const summary = renderSummary([], 3);

    expect(summary).toContain('Ledger is empty');
    expect(summary).not.toContain('| Test |');
  });

  test('renders one table row per entry with dates trimmed to a day', () => {
    const summary = renderSummary(
      [entry({ title: 'shaky', flakeCount: 4 })],
      3,
    );

    expect(summary).toContain(
      '| shaky | `authenticated` | 4 | 2026-01-01 | 2026-08-14 |',
    );
  });

  test('counts entries at or above the threshold', () => {
    const summary = renderSummary(
      [
        entry({ title: 'mild', flakeCount: 1 }),
        entry({ title: 'bad', flakeCount: 4 }),
        entry({ title: 'worse', flakeCount: 7 }),
      ],
      3,
    );

    expect(summary).toContain('**3** test(s) on record');
    expect(summary).toContain('**2** at or above the flake threshold (3)');
  });

  test('warns when an entry is at or above the threshold', () => {
    const hot = renderSummary([entry({ flakeCount: 5 })], 3);
    const cool = renderSummary([entry({ flakeCount: 1 })], 3);

    expect(hot).toContain('need a ticket, a reason, and an owner');
    expect(cool).toContain('below the threshold');
  });
});

test.describe('readLedger', { tag: '@regression' }, () => {
  test('returns an empty array for a path that does not exist', () => {
    expect(readLedger('/definitely/not/a/real/ledger.json')).toEqual([]);
  });

  test('reads the committed ledger without throwing', () => {
    // The real file. It is currently empty, which is itself the assertion:
    // an empty ledger must read as [] rather than as a parse failure.
    expect(Array.isArray(readLedger())).toBe(true);
  });
});
