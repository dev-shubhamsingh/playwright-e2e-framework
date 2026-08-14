# Visual Regression & Accessibility

Two suites that share a shape — each is a dedicated Chromium-only project scanning a
set of stable pages — and differ in exactly one consequential way: **one is gated in
CI and one cannot be.**

|                | Visual                            | Accessibility                         |
| -------------- | --------------------------------- | ------------------------------------- |
| Project        | `visual`                          | `a11y`                                |
| Test directory | `tests/saucedemo/visual`          | `tests/saucedemo/a11y`                |
| Tool           | `toHaveScreenshot` (built in)     | `@axe-core/playwright`                |
| Output         | Binary PNG baselines, OS-specific | Rule violations, platform-independent |
| Gated in CI    | **No**                            | **Yes** (`test-a11y`)                 |
| Command        | `npm run test:visual`             | `npm run test:a11y`                   |

Both depend on the `setup` project for `storageState`, and both are excluded from the
cross-browser projects via `UI_TEST_IGNORE`.

---

## Visual regression

### The spec shape

```ts
test.describe('Visual regression', { tag: '@visual' }, () => {
  const shot = {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
  } as const;

  test('inventory page', async ({ authenticatedPage, page }) => {
    await expect(authenticatedPage.getProductCount()).resolves.toBeGreaterThan(
      0,
    );
    await expect(page).toHaveScreenshot('inventory.png', shot);
  });
});
```

Three details carry the reliability:

- **`animations: 'disabled'`** freezes transitions. Without it you are photographing a
  moving target and every run differs.
- **`maxDiffPixelRatio: 0.01`** absorbs sub-pixel antialiasing noise. Tight enough to
  catch a real layout change, loose enough to survive a font-rendering nudge. Do not
  raise it to make a failing test pass — that erases the signal.
- **Assert the page is ready first.** `getProductCount()` resolving above zero proves
  content has loaded before the shot. A screenshot of a half-rendered page is a
  baseline you will fight forever.

Shared `shot` options as one `as const` object keeps every snapshot in the suite
consistent — a per-test variation is how baselines drift apart.

### Why it isn't gated

Baselines live beside the spec in `visual.spec.ts-snapshots/` and are committed as
`*-visual-darwin.png`. The platform suffix is Playwright telling you the truth: pixel
output depends on OS font rendering, and a macOS baseline compared against a Linux
runner fails on antialiasing alone, on every test, forever.

Gating it would require generating and maintaining Linux baselines through the
Playwright Docker image — a second baseline set to keep in sync, updated on every
intentional visual change.

**That work is not done.** So when you touch a visual spec, say plainly: CI will not
catch a regression here; it is a local guard, run deliberately.

This is an honest tradeoff, documented rather than hidden. Do not describe the visual
suite as CI coverage, and do not quietly add it to a workflow — a job comparing darwin
baselines on Linux is worse than no job, because it produces a permanent red that
teaches people to ignore failures.

### Updating baselines

```bash
npm run test:visual           # verify against committed baselines
npm run test:visual:update    # regenerate, then REVIEW the diff
```

`--update-snapshots` overwrites without asking. Always inspect the regenerated PNGs
before committing — the whole failure mode of visual testing is blessing a real
regression because updating was easier than diagnosing.

Regenerating a baseline on a different OS than the committed ones replaces
`-darwin.png` with your platform's file and breaks the suite for everyone else. If you
are not on macOS, do not update these baselines; report the mismatch instead.

### Adding a page

Only add pages that are **stable**. A page with dynamic content, timestamps, rotating
imagery, or animation is a permanent false-failure generator. The three current
subjects — inventory, product detail, empty cart — were chosen for exactly that
reason.

---

## Accessibility

### The spec shape

```ts
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Documented, accepted critical violations per page (rule ids). */
const KNOWN_CRITICAL: Record<string, string[]> = {
  inventory: ['select-name'], // SauceDemo: sort dropdown has no accessible name
  cart: [],
  'checkout-overview': [],
};

async function scanCriticals(page: Page, info: TestInfo, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  await info.attach(`axe-${label}`, {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });

  const critical = violations
    .filter((v) => v.impact === 'critical')
    .map((v) => v.id);
  const allowed = KNOWN_CRITICAL[label] ?? [];
  return critical.filter((id) => !allowed.includes(id));
}

test('inventory page has no new critical violations', async ({
  authenticatedPage,
  page,
}, testInfo) => {
  await expect(authenticatedPage.getProductCount()).resolves.toBeGreaterThan(0);
  expect(await scanCriticals(page, testInfo, 'inventory')).toEqual([]);
});
```

Standard: **WCAG 2.0 and 2.1, levels A and AA** — the conformance target almost every
policy and procurement requirement names. Set via `withTags`, which is the axe API for
scoping to a rule set rather than running everything including experimental rules.

### The `KNOWN_CRITICAL` baseline pattern

This is the part worth understanding, and the part most likely to be got wrong.

SauceDemo is a third-party app. It ships a genuine critical WCAG defect: the inventory
sort `<select>` has no accessible name (`select-name`). We cannot fix it.

Three ways to handle that, and only one is right:

| Approach                                                | Result                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Ignore all criticals                                    | The suite can never fail. Coverage theatre                                           |
| Disable the `select-name` rule globally                 | A real `select-name` defect on _another_ page becomes invisible                      |
| **Baseline the specific rule id, on the specific page** | The suite fails on any _new_ critical, anywhere. A regression guard that still works |

So `KNOWN_CRITICAL` is keyed by page, holds specific rule ids, and each entry carries a
comment saying what the defect is. The scan then subtracts only those, per page.

Rules for maintaining it:

- **Per page, per rule id.** Never a global ignore list, never a whole rule category.
- **Every entry gets a comment** naming the defect and why it is accepted.
- **A new entry needs justification.** Adding one to make a red suite green is exactly
  the "weakening an assertion" anti-pattern. If a _new_ critical appears, it is a
  finding first — report it before considering a baseline.
- **Removing an entry is good news.** If the target fixes the defect, the suite starts
  failing because a baselined violation no longer occurs. Remove it and say so.

The full violation set — not just criticals — is attached to the report on every run
via `info.attach`, so it surfaces in the Playwright HTML report and Allure. Serious
non-critical violations are visible for review even though they do not fail the build.

### Why only criticals fail

Deliberate scope. Axe reports `minor` / `moderate` / `serious` / `critical`. Failing on
everything against an app we cannot fix would make the suite permanently red and
worthless. Failing on new **criticals** gives a real gate with a real signal.

If you widen it to `serious`, expect a large initial baseline and say what you are
taking on. Don't do it silently.

### Why it _is_ gated

Axe output is platform-independent — a rule violation is a rule violation on macOS and
Linux alike. That is the entire reason `test-a11y` gates while `visual` does not, and
it is worth stating when someone asks why the two suites are treated differently.

---

## Verify

```bash
npm run test:visual      # 3 tests, needs a browser and macOS baselines
npm run test:a11y        # 3 tests, needs a browser
npm run typecheck && npm run lint
```

Both suites need a browser and network reach to the live target. If you cannot launch
one, say which suite you did not execute and why. A visual suite in particular cannot
be reasoned about from source — the assertion is a pixel comparison.

## Checklist

- [ ] Visual: the page is genuinely stable — no dynamic content, no animation.
- [ ] Visual: `animations: 'disabled'` and the shared `shot` options are used.
- [ ] Visual: the page is asserted ready before the screenshot.
- [ ] Visual: `maxDiffPixelRatio` unchanged.
- [ ] Visual: baselines regenerated only on macOS, and the diff was reviewed.
- [ ] Visual: the summary says CI does not gate this.
- [ ] A11y: scoped with `withTags(WCAG_TAGS)`, not a bare `analyze()`.
- [ ] A11y: full violations attached to the report.
- [ ] A11y: no new `KNOWN_CRITICAL` entry without a comment and a justification.
- [ ] A11y: a newly-discovered critical was reported as a finding, not baselined away.
