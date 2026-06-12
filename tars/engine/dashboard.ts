#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { TarsResults } from '../reporter/TarsReporter.ts';

/**
 * TARS — Mission Control dashboard.
 *
 * Reads the machine-readable run summary that Mission Control emits
 * (tars-results.json) and renders a single self-contained HTML file
 * (tars-dashboard.html) — no build step, no server, no dependencies. Open it
 * in a browser, or screenshot it.
 *
 *   npm run tars:dashboard
 */

const RESULTS = path.join(process.cwd(), 'tars-results.json');
const OUT = path.join(process.cwd(), 'tars-dashboard.html');

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function bars(rows: { name: string; count: number }[]): string {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return rows
    .map(
      (r) => `
      <div class="bar-row">
        <span class="bar-label">${r.name}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(r.count / max) * 100}%"></span></span>
        <span class="bar-count">${r.count}</span>
      </div>`,
    )
    .join('');
}

function main(): void {
  if (!existsSync(RESULTS)) {
    console.error(
      'No tars-results.json found. Run a suite first (e.g. npm run test:api).',
    );
    process.exitCode = 1;
    return;
  }

  const d = JSON.parse(readFileSync(RESULTS, 'utf8')) as TarsResults;
  const green = d.status === 'passed';
  const verdict = green ? 'ALL SYSTEMS GREEN' : 'ATTENTION REQUIRED';
  const accent = green ? '#3fb950' : '#f85149';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TARS — Mission Control</title>
<style>
  :root { --accent:${accent}; --bg:#0d1117; --panel:#161b22; --line:#30363d; --text:#e6edf3; --muted:#8b949e; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; padding:40px; }
  .wrap { max-width:1000px; margin:0 auto; }
  .top { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:20px; margin-bottom:28px; }
  .brand { font-size:26px; font-weight:700; letter-spacing:.5px; }
  .brand small { color:var(--muted); font-weight:400; font-size:13px; display:block; letter-spacing:0; }
  .verdict { font-weight:700; font-size:15px; color:var(--accent); border:1px solid var(--accent); border-radius:999px; padding:8px 18px; }
  .cards { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:20px; }
  .card .n { font-size:32px; font-weight:700; }
  .card .l { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.8px; margin-top:4px; }
  .card.accent .n { color:var(--accent); }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .panel { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:20px; margin-bottom:16px; }
  .panel h2 { font-size:13px; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); margin-bottom:16px; }
  .bar-row { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
  .bar-label { width:120px; color:var(--text); font-size:13px; }
  .bar-track { flex:1; height:8px; background:#21262d; border-radius:999px; overflow:hidden; }
  .bar-fill { display:block; height:100%; background:var(--accent); }
  .bar-count { width:32px; text-align:right; color:var(--muted); font-size:13px; }
  .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--line); font-size:13px; }
  .row:last-child { border:0; }
  .row .muted { color:var(--muted); }
  .flake { color:#d29922; }
  footer { color:var(--muted); font-size:12px; margin-top:28px; text-align:center; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">🤖 TARS<small>Mission Control · ${new Date(d.generatedAt).toLocaleString()}</small></div>
      <div class="verdict">${green ? '🟢' : '🔴'} ${verdict}</div>
    </div>

    <div class="cards">
      <div class="card accent"><div class="n">${d.passRate}%</div><div class="l">Pass rate</div></div>
      <div class="card"><div class="n">${d.flakeRate}%</div><div class="l">Flake rate</div></div>
      <div class="card"><div class="n">${d.total}</div><div class="l">Tests</div></div>
      <div class="card"><div class="n">${fmtMs(d.durationMs)}</div><div class="l">Wall time</div></div>
    </div>

    <div class="grid">
      <div class="panel"><h2>By project</h2>${bars(d.byProject)}</div>
      <div class="panel"><h2>By tag</h2>${bars(d.byTag)}</div>
    </div>

    <div class="panel">
      <h2>Slowest paths</h2>
      ${d.slowest
        .map(
          (s) =>
            `<div class="row"><span>${s.title} <span class="muted">· ${s.project}</span></span><span class="muted">${fmtMs(s.durationMs)}</span></div>`,
        )
        .join('')}
    </div>

    ${
      d.flaky.length
        ? `<div class="panel"><h2>⚠️ Flake watch — quarantine candidates</h2>${d.flaky
            .map(
              (f) =>
                `<div class="row flake"><span>${f.title}</span><span class="muted">${f.project}</span></div>`,
            )
            .join('')}</div>`
        : ''
    }

    <footer>Generated by TARS Mission Control · ${d.passed} passed · ${d.failed} failed · ${d.skipped} skipped</footer>
  </div>
</body>
</html>`;

  writeFileSync(OUT, html);

  console.log(`🤖 TARS dashboard written to ${OUT}\n   open it: open ${OUT}`);
}

main();
