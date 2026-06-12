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

interface RunResults {
  flaky: { project: string; title: string }[];
}

interface QuarantineEntry {
  project: string;
  title: string;
  flakeCount: number;
  firstSeen: string;
  lastSeen: string;
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

function keyOf(e: { project: string; title: string }): string {
  return `${e.project}␟${e.title}`;
}

function main(): void {
  const log = console.log;
  const results = readJson<RunResults>(RESULTS_FILE, { flaky: [] });

  if (!results.flaky.length) {
    log('\n🤖 TARS — Auto-Quarantine\n   No flaky tests in the last run. ✅\n');
    return;
  }

  const ledger = readJson<QuarantineEntry[]>(LEDGER_FILE, []);
  const byKey = new Map(ledger.map((e) => [keyOf(e), e]));
  const now = new Date().toISOString();
  const added: string[] = [];
  const updated: string[] = [];

  for (const f of results.flaky) {
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

  const next = [...byKey.values()].sort((a, b) => b.flakeCount - a.flakeCount);
  writeFileSync(LEDGER_FILE, JSON.stringify(next, null, 2) + '\n');

  log('\n🤖 TARS — Auto-Quarantine');
  log(`   flaky this run: ${results.flaky.length}`);
  log(`   newly quarantined: ${added.length}`);
  added.forEach((t) => log(`     + ${t}`));
  log(`   re-offenders updated: ${updated.length}`);
  updated.forEach((t) => log(`     ↑ ${t}`));
  log(`   ledger: tars/quarantine.json (${next.length} total)\n`);
}

main();
