import { test, expect } from '@playwright/test';
import {
  computeTrend,
  parseHistory,
  renderTrend,
  toEntry,
  type HistoryEntry,
} from '../../../tars/engine/trend';
import type { TarsResults } from '../../../tars/reporter/TarsReporter';

/**
 * Framework unit tests for trend memory.
 *
 * The judgment worth protecting here is scope-awareness: comparing a full run
 * against an api-only run would report a meaningless regression and train people
 * to ignore the trend. Runs of a different scope are excluded, not normalised.
 */

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    at: '2026-08-01T10:00:00.000Z',
    scope: 'api+authenticated',
    total: 50,
    passRate: 100,
    flakeRate: 0,
    failed: 0,
    durationMs: 20_000,
    ...overrides,
  };
}

test.describe('toEntry', { tag: '@regression' }, () => {
  test('reduces a run to the tracked signals, with a sorted scope key', () => {
    const results = {
      generatedAt: '2026-08-14T12:00:00.000Z',
      total: 49,
      passRate: 98,
      flakeRate: 2,
      failed: 1,
      durationMs: 21_000,
      byProject: [
        { name: 'login', count: 8 },
        { name: 'authenticated', count: 41 },
      ],
    } as unknown as TarsResults;

    // Sorted so the same two projects always produce the same key, whatever
    // order the reporter happened to emit them in.
    expect(toEntry(results)).toEqual({
      at: '2026-08-14T12:00:00.000Z',
      scope: 'authenticated+login',
      total: 49,
      passRate: 98,
      flakeRate: 2,
      failed: 1,
      durationMs: 21_000,
    });
  });

  test('labels an empty run rather than producing an empty scope key', () => {
    const results = {
      generatedAt: 'x',
      total: 0,
      passRate: 0,
      flakeRate: 0,
      failed: 0,
      durationMs: 0,
      byProject: [],
    } as unknown as TarsResults;

    expect(toEntry(results).scope).toBe('none');
  });
});

test.describe('parseHistory', { tag: '@regression' }, () => {
  test('parses one entry per line', () => {
    const raw = `${JSON.stringify(entry())}\n${JSON.stringify(entry({ total: 60 }))}\n`;
    expect(parseHistory(raw)).toHaveLength(2);
  });

  test('skips a malformed line instead of throwing', () => {
    // A truncated write must cost one line, not the whole history.
    const raw = `${JSON.stringify(entry())}\n{"broken":\n${JSON.stringify(entry())}\n`;
    expect(parseHistory(raw)).toHaveLength(2);
  });

  test('skips a line that parses but is not a history entry', () => {
    const raw = `${JSON.stringify(entry())}\n{"unrelated":true}\n`;
    expect(parseHistory(raw)).toHaveLength(1);
  });

  test('returns an empty array for empty or blank input', () => {
    expect(parseHistory('')).toEqual([]);
    expect(parseHistory('\n\n  \n')).toEqual([]);
  });
});

test.describe('computeTrend — scope isolation', { tag: '@regression' }, () => {
  test('ignores runs of a different scope', () => {
    const current = entry({ at: 'now', scope: 'api', durationMs: 5_000 });
    const history = [
      entry({ scope: 'authenticated', durationMs: 90_000 }),
      entry({ scope: 'visual', durationMs: 80_000 }),
    ];

    const t = computeTrend(current, history);

    // A 5s api run must not be reported as a huge speed-up against a 90s UI run.
    expect(t.previous).toEqual([]);
    expect(t.durationDelta).toBeNull();
    expect(t.verdict).toContain('First recorded run');
  });

  test('excludes the current run from its own comparison', () => {
    const current = entry({ at: 'same-timestamp' });
    const t = computeTrend(current, [current]);

    expect(t.previous).toEqual([]);
  });

  test('compares only within the window, most recent first', () => {
    const current = entry({ at: 'now' });
    const history = Array.from({ length: 9 }, (_, i) =>
      entry({ at: `2026-08-0${i + 1}T10:00:00.000Z` }),
    );

    const t = computeTrend(current, history, 3);

    expect(t.previous).toHaveLength(3);
    expect(t.previous[0].at).toBe('2026-08-09T10:00:00.000Z');
  });
});

test.describe(
  'computeTrend — deltas and verdict',
  { tag: '@regression' },
  () => {
    test('reports a rising flake rate', () => {
      const t = computeTrend(entry({ at: 'now', flakeRate: 4 }), [
        entry({ flakeRate: 0 }),
        entry({ at: 'b', flakeRate: 0 }),
      ]);

      expect(t.flakeRateDelta).toBe(4);
      expect(t.verdict).toContain('flake up 4pp');
    });

    test('reports a falling pass rate', () => {
      const t = computeTrend(entry({ at: 'now', passRate: 90 }), [
        entry({ passRate: 100 }),
      ]);

      expect(t.passRateDelta).toBe(-10);
      expect(t.verdict).toContain('pass rate down 10pp');
    });

    test('calls a steady run stable', () => {
      const t = computeTrend(entry({ at: 'now' }), [
        entry(),
        entry({ at: 'b' }),
      ]);

      expect(t.verdict).toContain('Stable');
      expect(t.flakeRateDelta).toBe(0);
    });

    test('ignores a small absolute slowdown', () => {
      // 2s on a 20s suite is runner noise, not a regression.
      const t = computeTrend(entry({ at: 'now', durationMs: 22_000 }), [
        entry({ durationMs: 20_000 }),
      ]);

      expect(t.verdict).toContain('Stable');
    });

    test('ignores a large absolute slowdown that is proportionally small', () => {
      // 6s on a 10-minute suite is 1%. Flagging it would train people to ignore
      // the trend, which is worse than not reporting it.
      const t = computeTrend(entry({ at: 'now', durationMs: 606_000 }), [
        entry({ durationMs: 600_000 }),
      ]);

      expect(t.verdict).toContain('Stable');
    });

    test('flags a slowdown that is both large and proportionally significant', () => {
      const t = computeTrend(entry({ at: 'now', durationMs: 40_000 }), [
        entry({ durationMs: 20_000 }),
      ]);

      expect(t.verdict).toContain('slower by');
    });
  },
);

test.describe('renderTrend', { tag: '@regression' }, () => {
  test('shows signed deltas', () => {
    const out = renderTrend(
      computeTrend(entry({ at: 'now', passRate: 96, flakeRate: 2 }), [
        entry({ passRate: 100, flakeRate: 0 }),
      ]),
    );

    expect(out).toContain('-4pp');
    expect(out).toContain('+2pp');
  });

  test('omits the comparison table on a first run', () => {
    const out = renderTrend(computeTrend(entry({ at: 'now' }), []));

    expect(out).toContain('First recorded run');
    expect(out).not.toContain('| Run |');
  });
});
