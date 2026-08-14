## What and why

<!-- One or two sentences. What changes, and what problem it solves. -->

## Test level and rationale

<!-- Which level, and why not a cheaper one. A new UI spec taxes every PR
     forever — say what it catches that an API or unit test cannot. -->

- [ ] Level chosen: <!-- unit / api / contract / e2e / visual / a11y / performance -->

## Verification

<!-- The commands you ACTUALLY ran, with real results. -->

- [ ] `npm run typecheck && npm run lint && npm run format:check`
- [ ] `npm run test:unit`
- [ ] Suite touched: `______________________` → result: `_______`

**Not executed, and why:**

<!-- e.g. "Visual — not on macOS, so baselines would not match."
     Never imply a suite passed. -->

## Checklist

- [ ] No weakened assertions, added sleeps, raised timeouts, or extra retries.
- [ ] No `test.skip` without a ticket, a reason, and an owner.
- [ ] Assertions are web-first / retried, not `expect(await …)`.
- [ ] Locators live in page objects; role-first, then `data-test`.
- [ ] API responses assert status **and** parse through a zod schema.
- [ ] Auth negative included on any scoped endpoint.
- [ ] No `process.env` outside `@core/config/env`; path aliases used throughout.
- [ ] Docs updated, and no `✅` claims a capability that does not run.
- [ ] Each commit compiles standalone.

## Findings

<!-- Anything you found that the docs get wrong, or a defect in a target app.
     These are wanted, not noise. -->
