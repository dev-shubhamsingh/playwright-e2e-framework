#!/usr/bin/env tsx
import { execSync } from 'node:child_process';

/**
 * TARS — risk-based test selection (test-impact analysis).
 *
 * Maps the files changed in a branch/diff to the smallest set of tests that
 * could be affected, so a PR runs only what matters instead of the whole
 * suite. This is the judgment a senior SDET applies by instinct — "you touched
 * the cart page object, so re-run the cart and checkout specs" — encoded as a
 * deterministic rule set.
 *
 *   npx tsx tars/engine/select.ts [--base <git-ref>] [--command]
 *
 *   --base <ref>   Compare the working tree against this ref (default HEAD~1).
 *   --command      Print the ready-to-run `npx playwright test ...` line only.
 *
 * Exit codes: 0 = selection produced (or full-suite recommended). Designed to
 * be wired into CI to shard PR runs.
 */

type Selection = { paths: string[]; full: boolean; reason: string };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function changedFiles(base: string): string[] {
  try {
    const out = execSync(`git diff --name-only ${base} -- .`, {
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Files that force a full run — they can affect anything. */
function isGlobal(file: string): boolean {
  return (
    file.startsWith('src/core/') ||
    file.startsWith('src/shared/') ||
    file === 'playwright.config.ts' ||
    file === 'tsconfig.json' ||
    file === 'package.json' ||
    file === 'package-lock.json'
  );
}

function select(files: string[]): Selection {
  if (files.length === 0) {
    return { paths: [], full: false, reason: 'no changes detected' };
  }

  const paths = new Set<string>();
  for (const f of files) {
    if (isGlobal(f)) {
      return {
        paths: ['tests'],
        full: true,
        reason: `core/shared/config changed (${f})`,
      };
    }
    // A changed spec runs itself.
    if (f.startsWith('tests/') && f.endsWith('.spec.ts')) {
      paths.add(f);
    } else if (
      f.startsWith('src/saucedemo/') ||
      f.startsWith('tests/saucedemo/')
    ) {
      paths.add('tests/saucedemo');
    } else if (
      f.startsWith('src/dummyjson/') ||
      f.startsWith('tests/dummyjson/')
    ) {
      paths.add('tests/dummyjson');
    }
  }

  return {
    paths: [...paths],
    full: false,
    reason: paths.size
      ? 'mapped from changed files'
      : 'no test-affecting changes',
  };
}

function main(): void {
  const base = arg('--base') ?? 'HEAD~1';
  const files = changedFiles(base);
  const result = select(files);

  if (hasFlag('--command')) {
    const target = result.paths.length ? result.paths.join(' ') : '';
    process.stdout.write(`npx playwright test ${target}`.trim() + '\n');
    return;
  }

  const log = console.log;
  log('\n🤖 TARS — Risk-Based Test Selection');
  log(`   base: ${base}\n`);
  log(`Changed files (${files.length}):`);
  files.forEach((f) => log(`  · ${f}`));
  log(`\nDecision: ${result.reason}`);
  if (result.full) {
    log('→ Full suite recommended.');
  } else if (result.paths.length) {
    log('→ Run only:');
    result.paths.forEach((p) => log(`  ▶ ${p}`));
    log(`\n  npx playwright test ${result.paths.join(' ')}`);
  } else {
    log('→ No test-affecting changes detected.');
  }
  log('');
}

main();
