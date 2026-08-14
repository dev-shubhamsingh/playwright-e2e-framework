#!/usr/bin/env tsx
import {
  readFileSync,
  existsSync,
  appendFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import type { TarsResults } from '../reporter/TarsReporter.ts';
import { fmtMs } from '../lib/format.ts';

/**
 * TARS — trend memory.
 *
 * Mission Control is stateless: it judges every run alone, so it can tell you
 * "flake is 2%" but never "flake was 0% last week". That makes the interesting
 * questions unanswerable — is flake rising, is the suite getting slower, which
 * project is degrading.
 *
 * This engine appends each run to a committed JSONL history and reports the
 * delta against recent runs.
 *
 *   npm run tars:trend             # append the last run + print the trend
 *   npm run tars:trend -- --report # print the trend WITHOUT appending
 *
 * JSONL rather than JSON: appending a line never rewrites the file, so two runs
 * cannot clobber each other's history, and a corrupt tail costs one line rather
 * than the whole record.
 */

const HISTORY_FILE = path.join(process.cwd(), 'tars', 'history.jsonl');
const RESULTS_FILE = path.join(process.cwd(), 'tars-results.json');

/** One run, reduced to the signals worth tracking over time. */
export interface HistoryEntry {
  at: string;
  /** Which projects the run covered — a full run and an api-only run are not comparable. */
  scope: string;
  total: number;
  passRate: number;
  flakeRate: number;
  failed: number;
  durationMs: number;
}

export interface Trend {
  current: HistoryEntry;
  /** Previous comparable runs, most recent first. */
  previous: HistoryEntry[];
  passRateDelta: number | null;
  flakeRateDelta: number | null;
  durationDelta: number | null;
  /** Plain-language read on the direction of travel. */
  verdict: string;
}

/** Reduce a run's results to a history entry. */
export function toEntry(results: TarsResults): HistoryEntry {
  return {
    at: results.generatedAt,
    scope: [...results.byProject.map((p) => p.name)].sort().join('+') || 'none',
    total: results.total,
    passRate: results.passRate,
    flakeRate: results.flakeRate,
    failed: results.failed,
    durationMs: results.durationMs,
  };
}

/**
 * Parse a JSONL history, skipping malformed lines rather than throwing.
 *
 * A single bad line must not make the whole history unreadable — that would turn
 * a reporting nicety into a pipeline failure.
 */
export function parseHistory(raw: string): HistoryEntry[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as HistoryEntry;
        return typeof parsed?.passRate === 'number' ? [parsed] : [];
      } catch {
        return [];
      }
    });
}

/**
 * Compare a run against the most recent runs of the same scope.
 *
 * Scope matters: comparing a full run's duration against an api-only run's would
 * report a meaningless regression. Runs of a different scope are excluded rather
 * than normalised, because there is no honest way to normalise them.
 */
export function computeTrend(
  current: HistoryEntry,
  history: HistoryEntry[],
  window = 5,
): Trend {
  const comparable = history
    .filter((e) => e.scope === current.scope && e.at !== current.at)
    .slice(-window)
    .reverse();

  if (!comparable.length) {
    return {
      current,
      previous: [],
      passRateDelta: null,
      flakeRateDelta: null,
      durationDelta: null,
      verdict: `First recorded run for scope \`${current.scope}\` — nothing to compare against yet.`,
    };
  }

  const mean = (pick: (e: HistoryEntry) => number) =>
    comparable.reduce((acc, e) => acc + pick(e), 0) / comparable.length;

  const passRateDelta = round(current.passRate - mean((e) => e.passRate), 2);
  const flakeRateDelta = round(current.flakeRate - mean((e) => e.flakeRate), 2);
  const durationDelta = Math.round(
    current.durationMs - mean((e) => e.durationMs),
  );

  const notes: string[] = [];
  if (flakeRateDelta > 0.5) notes.push(`flake up ${flakeRateDelta}pp`);
  if (flakeRateDelta < -0.5)
    notes.push(`flake down ${Math.abs(flakeRateDelta)}pp`);
  if (passRateDelta < -1)
    notes.push(`pass rate down ${Math.abs(passRateDelta)}pp`);
  if (passRateDelta > 1) notes.push(`pass rate up ${passRateDelta}pp`);
  // Only flag a slowdown that is both large in absolute terms and proportionally
  // meaningful — runner noise routinely moves a short suite by a second.
  const meanDuration = mean((e) => e.durationMs);
  if (durationDelta > 5000 && durationDelta > meanDuration * 0.25) {
    notes.push(`slower by ${fmtMs(durationDelta)}`);
  }

  return {
    current,
    previous: comparable,
    passRateDelta,
    flakeRateDelta,
    durationDelta,
    verdict: notes.length
      ? `Change against the last ${comparable.length} run(s): ${notes.join(', ')}.`
      : `Stable against the last ${comparable.length} run(s).`,
  };
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function sign(n: number, unit: string): string {
  if (n === 0) return `±0${unit}`;
  return n > 0 ? `+${n}${unit}` : `${n}${unit}`;
}

export function renderTrend(t: Trend): string {
  const lines = [
    '## 🤖 TARS — Trend',
    '',
    `**${t.verdict}**`,
    '',
    `- Scope: \`${t.current.scope}\` · ${t.current.total} test(s)`,
    `- Pass rate: ${t.current.passRate}%${
      t.passRateDelta === null ? '' : ` (${sign(t.passRateDelta, 'pp')})`
    }`,
    `- Flake rate: ${t.current.flakeRate}%${
      t.flakeRateDelta === null ? '' : ` (${sign(t.flakeRateDelta, 'pp')})`
    }`,
    `- Duration: ${fmtMs(t.current.durationMs)}${
      t.durationDelta === null ? '' : ` (${sign(t.durationDelta, 'ms')})`
    }`,
    '',
  ];

  if (t.previous.length) {
    lines.push(
      '| Run | Tests | Pass | Flake | Duration |',
      '| --- | --- | --- | --- | --- |',
      ...[t.current, ...t.previous].map(
        (e, i) =>
          `| ${i === 0 ? '**this run**' : e.at.slice(0, 16).replace('T', ' ')} | ${e.total} | ${e.passRate}% | ${e.flakeRate}% | ${fmtMs(e.durationMs)} |`,
      ),
      '',
    );
  }

  return lines.join('\n');
}

function main(): void {
  if (!existsSync(RESULTS_FILE)) {
    console.error(
      '\n🤖 TARS trend: no tars-results.json found. Run a suite first.\n',
    );
    process.exitCode = 1;
    return;
  }

  const results = JSON.parse(readFileSync(RESULTS_FILE, 'utf8')) as TarsResults;
  const current = toEntry(results);

  const history = existsSync(HISTORY_FILE)
    ? parseHistory(readFileSync(HISTORY_FILE, 'utf8'))
    : [];

  // --report prints the trend without recording, so a local run can inspect the
  // history without adding noise to it.
  if (!process.argv.includes('--report')) {
    if (!existsSync(HISTORY_FILE)) writeFileSync(HISTORY_FILE, '');
    appendFileSync(HISTORY_FILE, JSON.stringify(current) + '\n');
  }

  const rendered = renderTrend(computeTrend(current, history));
  console.log(rendered);

  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) {
    try {
      appendFileSync(stepSummary, rendered + '\n');
    } catch {
      // Never fail a pipeline over a summary write.
    }
  }
}

if (require.main === module) {
  main();
}
