#!/usr/bin/env tsx
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { select, type Selection } from './select.ts';
import type { TarsResults } from '../reporter/TarsReporter.ts';

/**
 * TARS — selection shadow audit.
 *
 * Risk-based selection is only safe to trust once you can show it would not have
 * skipped a test that actually broke. This engine is that proof, run as a shadow
 * alongside the full suite:
 *
 *   1. compute what selection WOULD have run for this diff
 *   2. read what actually failed in the full run
 *   3. report every failure selection would have missed
 *
 * A miss is the one outcome that matters. Selection running too much is merely
 * slow; selection running too little hides a real defect behind a green gate, so
 * this audit fails loudly on a miss and stays quiet otherwise.
 *
 * Run it for a while with the full suite still gating. When the miss count has
 * been zero across a meaningful number of red runs, selection has earned the
 * right to narrow the gate. Until then it has not, whatever it looks like.
 *
 *   npm run tars:shadow -- --base origin/main
 *   npx tsx tars/engine/shadow.ts --files "a.spec.ts,b.spec.ts" --results tars-results.json
 */

export interface ShadowVerdict {
  /** Selection's decision for the diff. */
  selection: Selection;
  /** Spec files that failed in the full run. */
  failedFiles: string[];
  /** Failed files selection would NOT have run — the only dangerous case. */
  missed: string[];
  /** True when selection was safe for this run. */
  safe: boolean;
  /** Why it was safe or not, in one line. */
  reason: string;
}

/** Does a selection path cover this spec file? */
export function covers(selectionPath: string, file: string): boolean {
  if (!selectionPath || !file) return false;
  const p = selectionPath.replace(/\/+$/, '');
  return file === p || file.startsWith(`${p}/`);
}

/**
 * Audit a selection against the files that actually failed.
 *
 * Pure: no I/O, no git, no clock. Both inputs are supplied.
 */
export function audit(
  selection: Selection,
  failedFiles: string[],
): ShadowVerdict {
  const unique = [...new Set(failedFiles.filter(Boolean))];

  if (selection.full) {
    return {
      selection,
      failedFiles: unique,
      missed: [],
      safe: true,
      reason:
        'selection escalated to the full suite, so nothing could be missed',
    };
  }

  const missed = unique.filter(
    (file) => !selection.paths.some((p) => covers(p, file)),
  );

  return {
    selection,
    failedFiles: unique,
    missed,
    safe: missed.length === 0,
    reason: missed.length
      ? `selection would have skipped ${missed.length} failing spec(s)`
      : unique.length
        ? 'every failing spec was inside the selection'
        : 'no failures in this run, so the selection was not exercised',
  };
}

export function renderVerdict(v: ShadowVerdict): string {
  const lines = [
    '## 🤖 TARS — Selection Shadow Audit',
    '',
    v.safe
      ? '✅ **Selection was safe for this run.**'
      : '❌ **Selection would have MISSED a real failure.**',
    '',
    `- Decision: \`${v.selection.full ? 'full suite' : v.selection.paths.join(', ') || 'nothing'}\` — ${v.selection.reason}`,
    `- Failing specs this run: ${v.failedFiles.length}`,
    `- Would have been skipped: **${v.missed.length}**`,
    `- Verdict: ${v.reason}`,
    '',
  ];

  if (v.missed.length) {
    lines.push(
      'Specs selection would have skipped while they were failing:',
      '',
      ...v.missed.map((f) => `- \`${f}\``),
      '',
      '> Selection must not narrow the gate until this is zero across a run of red',
      '> builds. A selection rule that skips a failing spec turns a red build green.',
      '',
    );
  }

  return lines.join('\n');
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function changedFilesFrom(base: string): string[] {
  try {
    return execSync(`git diff --name-only ${base} -- .`, { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main(): void {
  // Either an explicit file list (for testing and for CI where the diff is
  // already known) or a git base to diff against.
  const explicit = arg('--files');
  const files = explicit
    ? explicit
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : changedFilesFrom(arg('--base') ?? 'HEAD~1');

  const resultsFile = path.join(
    process.cwd(),
    arg('--results') ?? 'tars-results.json',
  );

  if (!existsSync(resultsFile)) {
    console.error(
      `\n🤖 TARS shadow: no ${path.basename(resultsFile)} found. Run a suite first.\n`,
    );
    process.exitCode = 1;
    return;
  }

  let failedFiles: string[];
  try {
    const results = JSON.parse(
      readFileSync(resultsFile, 'utf8'),
    ) as TarsResults;
    failedFiles = (results.failures ?? []).map((f) => f.file);
  } catch {
    console.error('\n🤖 TARS shadow: could not read the run results.\n');
    process.exitCode = 1;
    return;
  }

  const verdict = audit(select(files), failedFiles);
  const rendered = renderVerdict(verdict);
  console.log(rendered);

  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) {
    try {
      appendFileSync(stepSummary, rendered + '\n');
    } catch {
      // Never fail a pipeline over a summary write.
    }
  }

  // Only a miss is a failure. "Selection ran too much" is not an error here.
  if (!verdict.safe) process.exitCode = 1;
}

if (require.main === module) {
  main();
}
