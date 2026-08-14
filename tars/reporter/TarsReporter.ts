import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { writeFileSync } from 'fs';
import path from 'path';
import { fmtMs } from '../lib/format.ts';

/**
 * TARS Mission Control — a custom Playwright reporter that turns a raw test run
 * into quality intelligence.
 *
 * On every run it autonomously computes the signals a principal SDET would look
 * for first — pass rate, flake (tests that only went green on retry), the
 * slowest paths, and a breakdown by project and tag — then writes a Markdown
 * "mission control" brief (tars-report.md) and prints a compact console summary.
 *
 * Hard rule: a reporter must never break the run. Everything here is defensive
 * and wrapped; on any internal error it degrades silently rather than failing
 * the suite.
 */

export interface TestRecord {
  title: string;
  project: string;
  tags: string[];
  status: TestResult['status'];
  outcome: ReturnType<TestCase['outcome']>;
  durationMs: number;
  retries: number;
}

const REPORT_FILE = 'tars-report.md';
const RESULTS_FILE = 'tars-results.json';

/** Machine-readable run summary, consumed by `tars quarantine`, the dashboard, and CI. */
export interface TarsResults {
  generatedAt: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  flakeRate: number;
  durationMs: number;
  flaky: { project: string; title: string }[];
  byProject: { name: string; count: number }[];
  byTag: { name: string; count: number }[];
  slowest: { title: string; project: string; durationMs: number }[];
}

/** The signal set derived from a run's records. Pure — see `computeSignals`. */
export interface Signals {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  executed: number;
  /** Percentage string, one decimal, e.g. '96.0'. */
  passRate: string;
  /** Percentage string, two decimals, e.g. '4.00'. */
  flakeRate: string;
  flaky: TestRecord[];
  slowest: TestRecord[];
  byProject: Map<string, number>;
  byTag: Map<string, number>;
}

function groupCounts(
  recs: TestRecord[],
  key: (r: TestRecord) => string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of recs) {
    map.set(key(r), (map.get(key(r)) ?? 0) + 1);
  }
  return map;
}

/**
 * Derive every reported signal from a run's records. Pure and exported so the
 * counting rules — which are subtle and load-bearing — are directly testable.
 *
 * Key decisions encoded here:
 *   - `passed`/`failed`/`flaky` come from Playwright's *outcome*, not the raw
 *     status, so a test that failed then passed on retry counts as flaky rather
 *     than as both a pass and a fail.
 *   - Skipped tests are excluded from the pass-rate denominator, so skipping
 *     tests can never inflate the pass rate.
 *   - Zero executed tests yields '0.0' rather than NaN.
 */
export function computeSignals(recs: TestRecord[]): Signals {
  const total = recs.length;
  const passed = recs.filter((r) => r.outcome === 'expected').length;
  const failed = recs.filter((r) => r.outcome === 'unexpected').length;
  const flaky = recs.filter((r) => r.outcome === 'flaky');
  const skipped = recs.filter((r) => r.outcome === 'skipped').length;
  const executed = total - skipped;

  return {
    total,
    passed,
    failed,
    skipped,
    executed,
    passRate: executed ? ((passed / executed) * 100).toFixed(1) : '0.0',
    flakeRate: executed ? ((flaky.length / executed) * 100).toFixed(2) : '0.00',
    flaky,
    slowest: [...recs].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5),
    byProject: groupCounts(recs, (r) => r.project),
    byTag: groupCounts(recs, (r) =>
      r.tags.length ? r.tags.join(' ') : '(untagged)',
    ),
  };
}

export default class TarsReporter implements Reporter {
  // Keyed by test id so retries overwrite rather than double-count: one record
  // per test, holding its final attempt. Counting per attempt would inflate
  // totals and miscount flaky/failed once retries are on.
  private records = new Map<string, TestRecord>();
  private startedAt = 0;

  printsToStdio(): boolean {
    return true;
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startedAt = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    try {
      this.records.set(test.id, {
        title: test.title,
        project: test.titlePath()[1] || 'unknown',
        tags: test.tags ?? [],
        status: result.status,
        outcome: test.outcome(),
        durationMs: result.duration,
        retries: result.retry,
      });
    } catch {
      // Never let collection break a run.
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    try {
      const brief = this.buildBrief(result.status);
      writeFileSync(path.join(process.cwd(), REPORT_FILE), brief.markdown);
      writeFileSync(
        path.join(process.cwd(), RESULTS_FILE),
        JSON.stringify(brief.data, null, 2),
      );

      console.log(brief.console);
    } catch {
      // Degrade silently — the run result itself is unaffected.
    }
  }

  private buildBrief(runStatus: FullResult['status']): {
    markdown: string;
    console: string;
    data: TarsResults;
  } {
    const recs = [...this.records.values()];
    const {
      total,
      passed,
      failed,
      skipped,
      executed,
      passRate,
      flakeRate,
      flaky,
      slowest,
      byProject,
      byTag,
    } = computeSignals(recs);
    const wallMs = Date.now() - this.startedAt;

    const verdict =
      runStatus === 'passed'
        ? '🟢 ALL SYSTEMS GREEN'
        : runStatus === 'failed'
          ? '🔴 ATTENTION REQUIRED'
          : `⚠️  ${runStatus.toUpperCase()}`;

    const md = [
      '# 🤖 TARS — Mission Control Brief',
      '',
      `**Verdict:** ${verdict}`,
      '',
      '## Signals',
      '',
      '| Metric | Value |',
      '| --- | --- |',
      `| Pass rate | ${passRate}% (${passed}/${executed}) |`,
      `| Flake rate | ${flakeRate}% (${flaky.length} flaky) |`,
      `| Failed | ${failed} |`,
      `| Skipped | ${skipped} |`,
      `| Total | ${total} |`,
      `| Wall time | ${fmtMs(wallMs)} |`,
      '',
      '## By project',
      '',
      this.table('Project', byProject),
      '',
      '## By tag',
      '',
      this.table('Tag', byTag),
      '',
      '## Slowest paths',
      '',
      '| Test | Project | Duration |',
      '| --- | --- | --- |',
      ...slowest.map(
        (r) => `| ${r.title} | ${r.project} | ${fmtMs(r.durationMs)} |`,
      ),
      '',
      ...(flaky.length
        ? [
            '## ⚠️ Flake watch',
            '',
            'These passed only on retry — quarantine candidates:',
            '',
            ...flaky.map((r) => `- \`${r.project}\` › ${r.title}`),
            '',
          ]
        : []),
      '_Generated by TARS Mission Control._',
      '',
    ].join('\n');

    const con = [
      '',
      '┌─ 🤖 TARS Mission Control ─────────────────────────────',
      `│ ${verdict}`,
      `│ Pass ${passRate}% (${passed}/${executed})  ·  Flake ${flakeRate}%  ·  Fail ${failed}  ·  ${fmtMs(wallMs)}`,
      `│ Brief written to ${REPORT_FILE}`,
      '└───────────────────────────────────────────────────────',
    ].join('\n');

    const data: TarsResults = {
      generatedAt: new Date().toISOString(),
      status: runStatus,
      total,
      passed,
      failed,
      skipped,
      passRate: Number(passRate),
      flakeRate: Number(flakeRate),
      durationMs: wallMs,
      flaky: flaky.map((r) => ({ project: r.project, title: r.title })),
      byProject: [...byProject.entries()].map(([name, count]) => ({
        name,
        count,
      })),
      byTag: [...byTag.entries()].map(([name, count]) => ({ name, count })),
      slowest: slowest.map((r) => ({
        title: r.title,
        project: r.project,
        durationMs: r.durationMs,
      })),
    };

    return { markdown: md, console: con, data };
  }

  private table(label: string, counts: Map<string, number>): string {
    const rows = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `| ${k} | ${n} |`);
    return [`| ${label} | Tests |`, '| --- | --- |', ...rows].join('\n');
  }
}
