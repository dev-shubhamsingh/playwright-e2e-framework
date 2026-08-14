import { test, expect } from '@playwright/test';
import type { TestCase, TestResult } from '@playwright/test/reporter';
import TarsReporter, {
  computeSignals,
  type TestRecord,
} from '../../../tars/reporter/TarsReporter';

/**
 * Framework unit tests for Mission Control.
 *
 * Two contracts matter here, in this order:
 *
 *   1. The reporter can NEVER break a run. Every hook is wrapped defensively; a
 *      reporter that throws is worse than no reporter, because it turns a green
 *      suite red for a reason unrelated to the code under test.
 *   2. The counting rules are correct. They are subtle — outcome-based rather
 *      than status-based, skipped excluded from the denominator — and every
 *      number the project reports about itself depends on them.
 */

function record(overrides: Partial<TestRecord> = {}): TestRecord {
  return {
    title: 'a test',
    project: 'authenticated',
    tags: [],
    status: 'passed',
    outcome: 'expected',
    durationMs: 100,
    retries: 0,
    ...overrides,
  };
}

test.describe('computeSignals — counting', { tag: '@regression' }, () => {
  test('counts an all-green run', () => {
    const signals = computeSignals([
      record(),
      record({ title: 'b' }),
      record({ title: 'c' }),
    ]);

    expect(signals.total).toBe(3);
    expect(signals.passed).toBe(3);
    expect(signals.failed).toBe(0);
    expect(signals.executed).toBe(3);
    expect(signals.passRate).toBe('100.0');
    expect(signals.flakeRate).toBe('0.00');
  });

  test('counts a flaky test as flaky, not as a pass and not as a failure', () => {
    // The single most important rule. A test that failed then passed on retry has
    // status 'passed' but outcome 'flaky'. Counting it as a pass hides the flake;
    // counting it as a failure would red a green run.
    const signals = computeSignals([
      record({ title: 'solid' }),
      record({
        title: 'shaky',
        status: 'passed',
        outcome: 'flaky',
        retries: 1,
      }),
    ]);

    expect(signals.flaky).toHaveLength(1);
    expect(signals.flaky[0].title).toBe('shaky');
    expect(signals.passed).toBe(1);
    expect(signals.failed).toBe(0);
    expect(signals.flakeRate).toBe('50.00');
  });

  test('counts a genuine failure', () => {
    const signals = computeSignals([
      record({ title: 'ok' }),
      record({ title: 'broken', status: 'failed', outcome: 'unexpected' }),
    ]);

    expect(signals.failed).toBe(1);
    expect(signals.passed).toBe(1);
    expect(signals.passRate).toBe('50.0');
  });

  test('excludes skipped tests from the pass-rate denominator', () => {
    // Otherwise skipping tests would raise the pass rate, which is exactly the
    // wrong incentive.
    const signals = computeSignals([
      record({ title: 'ran' }),
      record({ title: 'ran too' }),
      record({ title: 'skipped', status: 'skipped', outcome: 'skipped' }),
    ]);

    expect(signals.total).toBe(3);
    expect(signals.skipped).toBe(1);
    expect(signals.executed).toBe(2);
    expect(signals.passRate).toBe('100.0');
  });

  test('reports 0.0 rather than NaN for a run with no executed tests', () => {
    const allSkipped = computeSignals([
      record({ status: 'skipped', outcome: 'skipped' }),
    ]);

    expect(allSkipped.passRate).toBe('0.0');
    expect(allSkipped.flakeRate).toBe('0.00');
    expect(Number.isNaN(Number(allSkipped.passRate))).toBe(false);
  });

  test('reports 0.0 rather than NaN for an empty run', () => {
    const empty = computeSignals([]);

    expect(empty.total).toBe(0);
    expect(empty.passRate).toBe('0.0');
    expect(empty.flakeRate).toBe('0.00');
  });
});

test.describe('computeSignals — grouping', { tag: '@regression' }, () => {
  test('counts tests per project', () => {
    const signals = computeSignals([
      record({ project: 'api' }),
      record({ project: 'api', title: 'b' }),
      record({ project: 'authenticated', title: 'c' }),
    ]);

    expect(signals.byProject.get('api')).toBe(2);
    expect(signals.byProject.get('authenticated')).toBe(1);
  });

  test('labels untagged tests explicitly rather than dropping them', () => {
    const signals = computeSignals([record({ tags: [] })]);

    expect(signals.byTag.get('(untagged)')).toBe(1);
  });

  test('groups multi-tag tests by their combined tag string', () => {
    const signals = computeSignals([
      record({ tags: ['@regression', '@smoke'] }),
      record({ title: 'b', tags: ['@regression'] }),
    ]);

    expect(signals.byTag.get('@regression @smoke')).toBe(1);
    expect(signals.byTag.get('@regression')).toBe(1);
  });

  test('returns the five slowest tests, slowest first', () => {
    const signals = computeSignals([
      record({ title: 'a', durationMs: 10 }),
      record({ title: 'b', durationMs: 500 }),
      record({ title: 'c', durationMs: 200 }),
      record({ title: 'd', durationMs: 900 }),
      record({ title: 'e', durationMs: 50 }),
      record({ title: 'f', durationMs: 700 }),
    ]);

    expect(signals.slowest).toHaveLength(5);
    expect(signals.slowest.map((r) => r.title)).toEqual([
      'd',
      'f',
      'b',
      'c',
      'e',
    ]);
  });

  test('does not mutate the input array while sorting', () => {
    const recs = [
      record({ title: 'slow', durationMs: 900 }),
      record({ title: 'fast', durationMs: 10 }),
    ];

    computeSignals(recs);

    expect(recs.map((r) => r.title)).toEqual(['slow', 'fast']);
  });
});

test.describe(
  'TarsReporter — defensive contract',
  { tag: '@regression' },
  () => {
    test('onTestEnd survives a malformed TestCase without throwing', () => {
      // A reporter that throws fails the whole run. This is the property that
      // matters most, so it is asserted directly rather than assumed.
      const reporter = new TarsReporter();
      const hostile = {
        get id(): string {
          throw new Error('id exploded');
        },
      } as unknown as TestCase;

      expect(() =>
        reporter.onTestEnd(hostile, {
          status: 'passed',
          duration: 1,
          retry: 0,
        } as TestResult),
      ).not.toThrow();
    });

    test('onTestEnd survives a TestCase whose outcome() throws', () => {
      const reporter = new TarsReporter();
      const hostile = {
        id: 'x',
        title: 'x',
        titlePath: () => ['', 'proj'],
        tags: [],
        outcome: () => {
          throw new Error('outcome exploded');
        },
      } as unknown as TestCase;

      expect(() =>
        reporter.onTestEnd(hostile, {
          status: 'passed',
          duration: 1,
          retry: 0,
        } as TestResult),
      ).not.toThrow();
    });

    test('records one entry per test id, so retries do not double-count', () => {
      // Two attempts of the same test must collapse to a single record holding the
      // final attempt. Counting per attempt would inflate totals the moment
      // retries are enabled — which they are, on CI.
      const reporter = new TarsReporter();
      const makeCase = (id: string, outcome: string) =>
        ({
          id,
          title: 'retried test',
          titlePath: () => ['', 'authenticated'],
          tags: [],
          outcome: () => outcome,
        }) as unknown as TestCase;

      reporter.onTestEnd(makeCase('same-id', 'flaky'), {
        status: 'failed',
        duration: 100,
        retry: 0,
      } as TestResult);
      reporter.onTestEnd(makeCase('same-id', 'flaky'), {
        status: 'passed',
        duration: 120,
        retry: 1,
      } as TestResult);

      // Reach the private map through the public shape the class exposes to the
      // reporter API; asserting the collapse is the point.
      const records = (
        reporter as unknown as { records: Map<string, TestRecord> }
      ).records;

      expect(records.size).toBe(1);
      expect(records.get('same-id')?.retries).toBe(1);
      expect(records.get('same-id')?.status).toBe('passed');
    });

    test('printsToStdio declares that it writes to the console', () => {
      expect(new TarsReporter().printsToStdio()).toBe(true);
    });
  },
);
