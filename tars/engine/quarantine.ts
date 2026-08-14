#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * TARS — auto-quarantine.
 *
 * Closes the loop on flake detection. Mission Control writes the flaky tests of
 * a run to `tars-results.json`; this engine folds them into a committed,
 * deduplicated ledger (`tars/quarantine.json`) that tracks how often each test
 * has flaked and when it was first/last seen.
 *
 * The ledger is the single source of truth for "known-flaky" — a reviewer
 * triages it, and CI can invert-grep it to keep the gate deterministic. Tests
 * are recorded, never silently deleted: quarantine is a holding cell, not a
 * graveyard.
 *
 *   npx tsx tars/engine/quarantine.ts
 */

export interface RunResults {
  flaky: { project: string; title: string }[];
}

export interface QuarantineEntry {
  project: string;
  title: string;
  flakeCount: number;
  firstSeen: string;
  lastSeen: string;
}

/** Result of folding a run's flakes into the ledger. */
export interface FoldResult {
  ledger: QuarantineEntry[];
  added: string[];
  updated: string[];
}

const RESULTS_FILE = path.join(process.cwd(), 'tars-results.json');
const LEDGER_FILE = path.join(process.cwd(), 'tars', 'quarantine.json');

function readJson<T>(file: string, fallback: T): T {
  try {
    return existsSync(file)
      ? (JSON.parse(readFileSync(file, 'utf8')) as T)
      : fallback;
  } catch {
    return fallback;
  }
}

export function keyOf(e: { project: string; title: string }): string {
  return `${e.project}␟${e.title}`;
}

/**
 * Fold a run's flaky tests into an existing ledger.
 *
 * Pure: no I/O, and `now` is injected rather than read from the clock, so the
 * result is fully determined by its inputs. Never mutates the input ledger.
 */
export function fold(
  ledger: QuarantineEntry[],
  flaky: RunResults['flaky'],
  now: string,
): FoldResult {
  const byKey = new Map(ledger.map((e) => [keyOf(e), { ...e }]));
  const added: string[] = [];
  const updated: string[] = [];

  for (const f of flaky) {
    const existing = byKey.get(keyOf(f));
    if (existing) {
      existing.flakeCount += 1;
      existing.lastSeen = now;
      updated.push(f.title);
    } else {
      byKey.set(keyOf(f), {
        project: f.project,
        title: f.title,
        flakeCount: 1,
        firstSeen: now,
        lastSeen: now,
      });
      added.push(f.title);
    }
  }

  return {
    ledger: [...byKey.values()].sort((a, b) => b.flakeCount - a.flakeCount),
    added,
    updated,
  };
}

function main(): void {
  const log = console.log;
  const results = readJson<RunResults>(RESULTS_FILE, { flaky: [] });

  if (!results.flaky.length) {
    log('\n🤖 TARS — Auto-Quarantine\n   No flaky tests in the last run. ✅\n');
    return;
  }

  const existing = readJson<QuarantineEntry[]>(LEDGER_FILE, []);
  const { ledger, added, updated } = fold(
    existing,
    results.flaky,
    new Date().toISOString(),
  );

  writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2) + '\n');

  log('\n🤖 TARS — Auto-Quarantine');
  log(`   flaky this run: ${results.flaky.length}`);
  log(`   newly quarantined: ${added.length}`);
  added.forEach((t) => log(`     + ${t}`));
  log(`   re-offenders updated: ${updated.length}`);
  updated.forEach((t) => log(`     ↑ ${t}`));
  log(`   ledger: tars/quarantine.json (${ledger.length} total)\n`);
}

// Only run the CLI when executed directly, so `fold()` above can be imported by
// tests without this module reading or writing files at import time.
if (require.main === module) {
  main();
}
