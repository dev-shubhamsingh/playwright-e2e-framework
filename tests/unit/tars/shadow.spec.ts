import { test, expect } from '@playwright/test';
import { audit, covers, renderVerdict } from '../../../tars/engine/shadow';
import type { Selection } from '../../../tars/engine/select';

/**
 * Framework unit tests for the selection shadow audit.
 *
 * This engine exists to answer one question — "would selection have skipped a
 * spec that actually failed?" — and the cost of getting it wrong is asymmetric.
 * A false "safe" verdict is what would let someone narrow the gate on bad
 * evidence, so the false-negative cases are covered hardest.
 */

function sel(overrides: Partial<Selection> = {}): Selection {
  return {
    paths: ['tests/saucedemo'],
    full: false,
    reason: 'mapped',
    ...overrides,
  };
}

test.describe('covers', { tag: '@regression' }, () => {
  test('a directory path covers a file beneath it', () => {
    expect(covers('tests/saucedemo', 'tests/saucedemo/e2e/cart.spec.ts')).toBe(
      true,
    );
  });

  test('an exact file path covers itself', () => {
    const f = 'tests/saucedemo/e2e/cart.spec.ts';
    expect(covers(f, f)).toBe(true);
  });

  test('a directory does not cover a sibling directory', () => {
    expect(covers('tests/saucedemo', 'tests/dummyjson/api/auth.spec.ts')).toBe(
      false,
    );
  });

  test('a path prefix that is not a directory boundary does not count', () => {
    // 'tests/sauce' must not be treated as covering 'tests/saucedemo/...' —
    // a naive startsWith would say yes and produce a false "safe" verdict.
    expect(covers('tests/sauce', 'tests/saucedemo/e2e/cart.spec.ts')).toBe(
      false,
    );
  });

  test('a trailing slash is tolerated', () => {
    expect(covers('tests/saucedemo/', 'tests/saucedemo/e2e/cart.spec.ts')).toBe(
      true,
    );
  });

  test('empty inputs never cover anything', () => {
    expect(covers('', 'tests/a.spec.ts')).toBe(false);
    expect(covers('tests', '')).toBe(false);
  });
});

test.describe('audit — the dangerous case', { tag: '@regression' }, () => {
  test('flags a failing spec outside the selection', () => {
    const v = audit(sel({ paths: ['tests/saucedemo'] }), [
      'tests/dummyjson/api/auth.spec.ts',
    ]);

    expect(v.safe).toBe(false);
    expect(v.missed).toEqual(['tests/dummyjson/api/auth.spec.ts']);
    expect(v.reason).toContain('would have skipped');
  });

  test('flags only the misses when some failures were covered', () => {
    const v = audit(sel({ paths: ['tests/saucedemo'] }), [
      'tests/saucedemo/e2e/cart.spec.ts',
      'tests/dummyjson/api/auth.spec.ts',
    ]);

    expect(v.safe).toBe(false);
    expect(v.missed).toEqual(['tests/dummyjson/api/auth.spec.ts']);
  });

  test('an empty selection misses every failure', () => {
    const v = audit(sel({ paths: [], reason: 'no test-affecting changes' }), [
      'tests/saucedemo/e2e/cart.spec.ts',
    ]);

    expect(v.safe).toBe(false);
    expect(v.missed).toHaveLength(1);
  });
});

test.describe('audit — the safe cases', { tag: '@regression' }, () => {
  test('a full-suite escalation can never miss', () => {
    const v = audit(sel({ full: true, paths: ['tests'] }), [
      'tests/dummyjson/api/auth.spec.ts',
      'tests/saucedemo/e2e/cart.spec.ts',
    ]);

    expect(v.safe).toBe(true);
    expect(v.missed).toEqual([]);
    expect(v.reason).toContain('full suite');
  });

  test('every failure inside the selection is safe', () => {
    const v = audit(sel({ paths: ['tests/saucedemo'] }), [
      'tests/saucedemo/e2e/cart.spec.ts',
      'tests/saucedemo/e2e/checkout.spec.ts',
    ]);

    expect(v.safe).toBe(true);
    expect(v.reason).toContain('inside the selection');
  });

  test('a green run is safe but says it proved nothing', () => {
    // Important: a run with no failures must not be reported as evidence that
    // selection works. It is simply untested.
    const v = audit(sel(), []);

    expect(v.safe).toBe(true);
    expect(v.reason).toContain('not exercised');
  });

  test('duplicate failing files are collapsed', () => {
    const v = audit(sel({ paths: ['tests/saucedemo'] }), [
      'tests/saucedemo/e2e/cart.spec.ts',
      'tests/saucedemo/e2e/cart.spec.ts',
    ]);

    expect(v.failedFiles).toHaveLength(1);
  });

  test('blank file entries are ignored rather than counted as misses', () => {
    // test.location can be absent, yielding ''. That must not read as a missed
    // spec — it would produce a permanent false alarm.
    const v = audit(sel({ paths: ['tests/saucedemo'] }), ['', '']);

    expect(v.failedFiles).toEqual([]);
    expect(v.safe).toBe(true);
  });
});

test.describe('renderVerdict', { tag: '@regression' }, () => {
  test('leads with a pass marker when safe', () => {
    expect(renderVerdict(audit(sel(), []))).toContain('Selection was safe');
  });

  test('leads with a failure marker and lists the missed specs', () => {
    const out = renderVerdict(
      audit(sel({ paths: ['tests/saucedemo'] }), [
        'tests/dummyjson/api/auth.spec.ts',
      ]),
    );

    expect(out).toContain('MISSED a real failure');
    expect(out).toContain('tests/dummyjson/api/auth.spec.ts');
    expect(out).toContain('must not narrow the gate');
  });
});
