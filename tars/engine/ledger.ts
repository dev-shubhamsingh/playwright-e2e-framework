#!/usr/bin/env tsx
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import type { QuarantineEntry } from './quarantine.ts';

/**
 * TARS — quarantine ledger consumer.
 *
 * `quarantine.ts` *writes* the ledger. This reads it, and is the piece that
 * turns a record into an action:
 *
 *   --summary   Render the ledger as Markdown. In CI it appends to
 *               $GITHUB_STEP_SUMMARY so quarantined tests are visible on the
 *               run page instead of only in a committed JSON file nobody opens.
 *   --grep      Print a Playwright `--grep-invert` pattern that excludes every
 *               ledger entry at or above the flake threshold, so a pipeline can
 *               opt into skipping known-flaky tests explicitly.
 *   --check     Exit non-zero if any entry is at or above --fail-at. Lets a
 *               pipeline refuse to let a test rot in quarantine indefinitely.
 *
 *   npm run tars:ledger -- --summary
 *   npx tsx tars/engine/ledger.ts --grep --threshold 3
 *   npx tsx tars/engine/ledger.ts --check --fail-at 10
 *
 * Deliberately NOT automatic: nothing here skips a test on its own. Silent
 * auto-skipping is how a quarantine ledger becomes a graveyard. A pipeline that
 * wants exclusion has to ask for it, in a step a reviewer can read.
 */

const LEDGER_FILE = path.join(process.cwd(), 'tars', 'quarantine.json');

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  const raw = i !== -1 ? process.argv[i + 1] : undefined;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

export function readLedger(file = LEDGER_FILE): QuarantineEntry[] {
  try {
    if (!existsSync(file)) return [];
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    return Array.isArray(parsed) ? (parsed as QuarantineEntry[]) : [];
  } catch {
    // A corrupt ledger must not break a pipeline — an empty ledger is the safe
    // reading, and the summary will show it as empty rather than lying.
    return [];
  }
}

/** Entries that have flaked at least `threshold` times. */
export function atOrAbove(
  ledger: QuarantineEntry[],
  threshold: number,
): QuarantineEntry[] {
  return ledger.filter((e) => e.flakeCount >= threshold);
}

/**
 * A `--grep-invert` pattern matching every given entry's title.
 * Returns an empty string when there is nothing to exclude — passing an empty
 * pattern to Playwright would match everything and skip the entire suite.
 */
export function grepInvertPattern(entries: QuarantineEntry[]): string {
  if (!entries.length) return '';
  return entries
    .map((e) => e.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
}

export function renderSummary(
  ledger: QuarantineEntry[],
  threshold: number,
): string {
  if (!ledger.length) {
    return [
      '## 🤖 TARS — Quarantine Ledger',
      '',
      '✅ Ledger is empty. No known-flaky tests.',
      '',
    ].join('\n');
  }

  const hot = atOrAbove(ledger, threshold);

  return [
    '## 🤖 TARS — Quarantine Ledger',
    '',
    `**${ledger.length}** test(s) on record · **${hot.length}** at or above the flake threshold (${threshold}).`,
    '',
    '| Test | Project | Flakes | First seen | Last seen |',
    '| --- | --- | --- | --- | --- |',
    ...ledger.map(
      (e) =>
        `| ${e.title} | \`${e.project}\` | ${e.flakeCount} | ${e.firstSeen.slice(0, 10)} | ${e.lastSeen.slice(0, 10)} |`,
    ),
    '',
    hot.length
      ? '> ⚠️ Entries at or above the threshold need a ticket, a reason, and an owner — or a fix. A ledger entry is a record, not a resolution.'
      : '> All entries are below the threshold. Still worth fixing.',
    '',
  ].join('\n');
}

function main(): void {
  const ledger = readLedger();
  const threshold = arg('--threshold', 3);

  if (hasFlag('--grep')) {
    // stdout only, so it can be captured into a shell variable.
    process.stdout.write(
      grepInvertPattern(atOrAbove(ledger, threshold)) + '\n',
    );
    return;
  }

  if (hasFlag('--check')) {
    const failAt = arg('--fail-at', 10);
    const rotting = atOrAbove(ledger, failAt);
    if (rotting.length) {
      console.error(
        `\n🤖 TARS — ${rotting.length} test(s) have flaked ${failAt}+ times and are still unresolved:`,
      );
      rotting.forEach((e) =>
        console.error(`   ✗ [${e.project}] ${e.title} (${e.flakeCount})`),
      );
      console.error('   Fix them or quarantine them properly.\n');
      process.exitCode = 1;
      return;
    }
    console.log(`\n🤖 TARS — no test has flaked ${failAt}+ times. ✅\n`);
    return;
  }

  const summary = renderSummary(ledger, threshold);
  console.log(summary);

  // In CI, surface it on the run page rather than burying it in job logs.
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) {
    try {
      appendFileSync(stepSummary, summary + '\n');
    } catch {
      // Never fail a pipeline over a summary write.
    }
  }
}

if (require.main === module) {
  main();
}
