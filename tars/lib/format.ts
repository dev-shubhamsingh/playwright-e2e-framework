/**
 * Shared formatting helpers for TARS output.
 *
 * `fmtMs` previously existed as identical copies in the reporter and the
 * dashboard; they are one function here so a change to the duration format can
 * never make the console brief and the dashboard disagree.
 */

/** Human-readable duration: `450ms`, `3.7s`, `2m 5s`. */
export function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

/**
 * Escape text for safe interpolation into HTML.
 *
 * Test titles and project names flow into the dashboard, and a title containing
 * `<`, `>`, or `&` would otherwise produce malformed markup — or, with a title
 * like `<img onerror=...>`, inject an element into the page. Titles are
 * self-authored, so this is a correctness fix first and a hardening measure
 * second, but interpolating untrusted-shaped text unescaped is never right.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
