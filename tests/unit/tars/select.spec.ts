import { test, expect } from '@playwright/test';
import { select, isGlobal } from '../../../tars/engine/select';

/**
 * Framework unit tests for risk-based test selection.
 *
 * This is the highest-consequence logic in the repository. A wrong answer here
 * does not fail — it silently runs fewer tests than it should, which is the one
 * failure mode that can let a real defect through while CI stays green. Every
 * rule gets pinned.
 *
 * Imported as a relative path rather than an alias because `tars/` has no path
 * alias; the module is safe to import because its CLI is guarded behind a
 * `require.main === module` check.
 */

test.describe('isGlobal', { tag: '@regression' }, () => {
  for (const file of [
    'src/core/http/ApiClient.ts',
    'src/core/config/env.ts',
    'src/shared/utils/helpers.ts',
    'playwright.config.ts',
    'tsconfig.json',
    'package.json',
    'package-lock.json',
  ]) {
    test(`treats ${file} as global`, () => {
      expect(isGlobal(file)).toBe(true);
    });
  }

  for (const file of [
    'src/saucedemo/pages/CartPage.ts',
    'src/dummyjson/clients/ProductsClient.ts',
    'tests/saucedemo/e2e/cart.spec.ts',
    'README.md',
    'tars/engine/select.ts',
  ]) {
    test(`does not treat ${file} as global`, () => {
      expect(isGlobal(file)).toBe(false);
    });
  }
});

test.describe('select — full-suite escalation', { tag: '@regression' }, () => {
  test('escalates to the full suite on a core change', () => {
    const result = select(['src/core/http/ApiClient.ts']);

    expect(result.full).toBe(true);
    expect(result.paths).toEqual(['tests']);
    // The reason must name the triggering file — a bare "full suite" verdict is
    // unauditable when someone asks why CI ran everything.
    expect(result.reason).toContain('src/core/http/ApiClient.ts');
  });

  test('escalates on a shared-utils change', () => {
    expect(select(['src/shared/utils/helpers.ts']).full).toBe(true);
  });

  test('escalates on a lockfile change', () => {
    expect(select(['package-lock.json']).full).toBe(true);
  });

  test('escalates when a global file appears LAST in the diff', () => {
    // Order must not matter. The loop returns early on the first global hit, so
    // a global file after several domain files must still win — otherwise
    // selection would depend on git's output ordering.
    const result = select([
      'src/saucedemo/pages/CartPage.ts',
      'tests/dummyjson/api/products.spec.ts',
      'playwright.config.ts',
    ]);

    expect(result.full).toBe(true);
    expect(result.paths).toEqual(['tests']);
  });
});

test.describe('select — domain mapping', { tag: '@regression' }, () => {
  test('maps a saucedemo source change to the saucedemo tests', () => {
    const result = select(['src/saucedemo/pages/CartPage.ts']);

    expect(result.full).toBe(false);
    expect(result.paths).toEqual(['tests/saucedemo']);
  });

  test('maps a dummyjson source change to the dummyjson tests', () => {
    const result = select(['src/dummyjson/clients/CartsClient.ts']);

    expect(result.paths).toEqual(['tests/dummyjson']);
  });

  test('selects a changed spec by itself', () => {
    const result = select(['tests/saucedemo/e2e/cart.spec.ts']);

    expect(result.paths).toEqual(['tests/saucedemo/e2e/cart.spec.ts']);
  });

  test('selects both domains for a cross-domain diff', () => {
    const result = select([
      'src/saucedemo/pages/CartPage.ts',
      'src/dummyjson/schemas/cart.schema.ts',
    ]);

    expect(result.full).toBe(false);
    expect(result.paths).toHaveLength(2);
    expect(result.paths).toContain('tests/saucedemo');
    expect(result.paths).toContain('tests/dummyjson');
  });

  test('deduplicates repeated domain mappings', () => {
    const result = select([
      'src/saucedemo/pages/CartPage.ts',
      'src/saucedemo/pages/LoginPage.ts',
      'src/saucedemo/data/products.ts',
    ]);

    expect(result.paths).toEqual(['tests/saucedemo']);
  });
});

test.describe('select — nothing to run', { tag: '@regression' }, () => {
  test('reports no changes for an empty diff', () => {
    const result = select([]);

    expect(result.full).toBe(false);
    expect(result.paths).toEqual([]);
    expect(result.reason).toBe('no changes detected');
  });

  test('selects nothing for a docs-only change', () => {
    const result = select(['README.md', 'docs/TESTING-SKILLS.md']);

    expect(result.full).toBe(false);
    expect(result.paths).toEqual([]);
    expect(result.reason).toBe('no test-affecting changes');
  });

  test('a tars/ engine change selects no specs', () => {
    // Documented limitation worth pinning: the engines are not mapped to the
    // unit tests that cover them, so changing select.ts does not select
    // tests/unit. Anyone tightening this rule should do it deliberately and
    // update this expectation.
    const result = select(['tars/engine/select.ts']);

    expect(result.paths).toEqual([]);
  });
});
