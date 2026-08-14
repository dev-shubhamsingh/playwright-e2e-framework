import { test, expect } from '@playwright/test';
import { fmtMs, escapeHtml } from '../../../tars/lib/format';
import { bars } from '../../../tars/engine/dashboard';

/**
 * Framework unit tests for the shared TARS formatting helpers and the dashboard
 * renderer.
 *
 * `fmtMs` was previously duplicated in the reporter and the dashboard; these
 * tests cover the single shared implementation both now use, so the console
 * brief and the HTML dashboard cannot disagree about a duration.
 */

test.describe('fmtMs', { tag: '@regression' }, () => {
  test('renders sub-second durations in milliseconds', () => {
    expect(fmtMs(0)).toBe('0ms');
    expect(fmtMs(450)).toBe('450ms');
    expect(fmtMs(999)).toBe('999ms');
  });

  test('renders seconds with one decimal at the 1000ms boundary', () => {
    expect(fmtMs(1000)).toBe('1.0s');
    expect(fmtMs(3700)).toBe('3.7s');
    expect(fmtMs(59_900)).toBe('59.9s');
  });

  test('renders minutes and seconds at the 60s boundary', () => {
    expect(fmtMs(60_000)).toBe('1m 0s');
    expect(fmtMs(125_000)).toBe('2m 5s');
    expect(fmtMs(3_600_000)).toBe('60m 0s');
  });
});

test.describe('escapeHtml', { tag: '@regression' }, () => {
  test('escapes the five HTML-significant characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  test('escapes the ampersand first so entities are not double-encoded wrongly', () => {
    // Order matters: escaping '<' before '&' would turn '<' into '&lt;' and then
    // its own '&' into '&amp;lt;'.
    expect(escapeHtml('<a>')).toBe('&lt;a&gt;');
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  test('leaves ordinary text untouched', () => {
    expect(escapeHtml('adds a product to the cart')).toBe(
      'adds a product to the cart',
    );
  });

  test('neutralises a title that would otherwise inject markup', () => {
    const injected = escapeHtml('<img src=x onerror=alert(1)>');

    expect(injected).not.toContain('<img');
    expect(injected).toContain('&lt;img');
  });
});

test.describe('dashboard bars()', { tag: '@regression' }, () => {
  test('scales the widest bar to 100%', () => {
    const html = bars([
      { name: 'authenticated', count: 40 },
      { name: 'api', count: 20 },
    ]);

    expect(html).toContain('width:100%');
    expect(html).toContain('width:50%');
  });

  test('does not divide by zero when every count is zero', () => {
    // Math.max(1, ...) guards this; an empty run must not render NaN%.
    const html = bars([{ name: 'nothing', count: 0 }]);

    expect(html).toContain('width:0%');
    expect(html).not.toContain('NaN');
  });

  test('renders an empty string for no rows', () => {
    expect(bars([])).toBe('');
  });

  test('escapes project names before interpolating them', () => {
    // Regression guard for the defect this fixed: names were interpolated raw,
    // so a name containing markup produced malformed (or injected) HTML.
    const html = bars([{ name: '<script>x</script>', count: 1 }]);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
