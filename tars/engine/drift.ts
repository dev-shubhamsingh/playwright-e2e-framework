#!/usr/bin/env tsx
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * TARS — documentation drift check.
 *
 * The agent skills and the canon are ~4,000 lines of instructions that an agent
 * will follow literally. Nothing type-checks them, so the first time a script is
 * renamed or a reference file moves, they start lying — and a skill that quotes a
 * command which no longer exists is worse than no skill, because the agent will
 * run it and report a confusing failure.
 *
 * This is the cheap insurance: it verifies that everything the docs *claim*
 * exists actually does.
 *
 *   1. every `npm run <script>` quoted in the docs exists in package.json
 *   2. every relative markdown link resolves to a real file
 *   3. every `--project=<name>` quoted in the docs exists in playwright.config.ts
 *
 *   npm run tars:drift
 *
 * Exits non-zero on any drift, so it can gate. Deliberately narrow: it checks
 * claims that are mechanically verifiable and says nothing about prose, because a
 * check that produces false alarms gets switched off.
 */

const DOC_ROOTS = ['.claude', 'docs'];
const DOC_FILES = ['CLAUDE.md', 'README.md', 'CONTRIBUTING.md', 'SECURITY.md'];

export interface DriftFinding {
  kind: 'script' | 'link' | 'project';
  file: string;
  line: number;
  detail: string;
}

/** Recursively collect markdown files under a directory. */
function markdownUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return markdownUnder(full);
    return full.endsWith('.md') ? [full] : [];
  });
}

export function docFiles(): string[] {
  return [
    ...DOC_ROOTS.flatMap(markdownUnder),
    ...DOC_FILES.filter((f) => existsSync(f)),
  ];
}

/**
 * Find every `npm run <script>` mentioned in the text.
 *
 * The character class includes digits deliberately: a pattern of `[a-z:]+` stops
 * at the digit in `test:a11y` and reports a phantom `test:a` script.
 */
export function quotedScripts(text: string): { name: string; line: number }[] {
  const out: { name: string; line: number }[] = [];
  text.split('\n').forEach((content, i) => {
    for (const m of content.matchAll(/npm run ([a-z0-9:-]+)/g)) {
      out.push({ name: m[1], line: i + 1 });
    }
  });
  return out;
}

/** Find every `--project=<name>` mentioned in the text. */
export function quotedProjects(text: string): { name: string; line: number }[] {
  const out: { name: string; line: number }[] = [];
  text.split('\n').forEach((content, i) => {
    for (const m of content.matchAll(/--project=([a-z0-9-]+)/g)) {
      // Skip shell/YAML interpolation like --project=${{ matrix.project }}.
      if (!m[1].startsWith('$')) out.push({ name: m[1], line: i + 1 });
    }
  });
  return out;
}

/** Find every relative markdown link in the text. */
export function relativeLinks(
  text: string,
): { target: string; line: number }[] {
  const out: { target: string; line: number }[] = [];
  text.split('\n').forEach((content, i) => {
    for (const m of content.matchAll(/\]\(([^)]+)\)/g)) {
      const target = m[1].split('#')[0].trim();
      if (!target) continue;
      if (/^(https?:|mailto:)/.test(target)) continue;
      out.push({ target, line: i + 1 });
    }
  });
  return out;
}

/** Project names declared in playwright.config.ts. */
export function declaredProjects(configSource: string): string[] {
  return [...configSource.matchAll(/name:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

export function findDrift(
  files: string[],
  scripts: Set<string>,
  projects: Set<string>,
): DriftFinding[] {
  const findings: DriftFinding[] = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const dir = path.dirname(file);

    for (const { name, line } of quotedScripts(text)) {
      if (!scripts.has(name)) {
        findings.push({
          kind: 'script',
          file,
          line,
          detail: `npm run ${name} — not in package.json`,
        });
      }
    }

    for (const { name, line } of quotedProjects(text)) {
      if (!projects.has(name)) {
        findings.push({
          kind: 'project',
          file,
          line,
          detail: `--project=${name} — not declared in playwright.config.ts`,
        });
      }
    }

    for (const { target, line } of relativeLinks(text)) {
      if (!existsSync(path.join(dir, target))) {
        findings.push({
          kind: 'link',
          file,
          line,
          detail: `${target} — does not resolve from ${dir}/`,
        });
      }
    }
  }

  return findings;
}

function main(): void {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const scripts = new Set(Object.keys(pkg.scripts ?? {}));
  const projects = new Set(
    declaredProjects(readFileSync('playwright.config.ts', 'utf8')),
  );

  const files = docFiles();
  const findings = findDrift(files, scripts, projects);

  console.log(`\n🤖 TARS — Documentation Drift Check`);
  console.log(
    `   checked ${files.length} file(s) against ${scripts.size} script(s) and ${projects.size} project(s)\n`,
  );

  if (!findings.length) {
    console.log(
      '   ✅ No drift. Every quoted command, project, and link resolves.\n',
    );
    return;
  }

  for (const f of findings) {
    console.error(`   ✗ ${f.file}:${f.line} [${f.kind}] ${f.detail}`);
  }
  console.error(
    `\n   ${findings.length} drift finding(s). The docs claim something the repo does not provide.\n`,
  );
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}
