# Security Testing — OWASP ZAP Passive Baseline

The smallest suite here, and the one where the constraints matter more than the
mechanics.

## What exists

`.github/workflows/security.yml` — `zaproxy/action-baseline@v0.15.0`, manual dispatch
only, with a `target` URL input defaulting to `https://www.saucedemo.com`.

| Setting               | Value                    | Why                                                                            |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| Trigger               | `workflow_dispatch` only | Never scheduled — see below                                                    |
| `fail_action`         | `false`                  | Non-gating: findings against infrastructure we don't control are informational |
| `allow_issue_writing` | `false`                  | No auto-filed issues                                                           |
| `cmd_options`         | `-a`                     | Includes alpha passive rules for broader coverage                              |
| `rules_file_name`     | `.zap/rules.tsv`         | Rule tuning                                                                    |
| `permissions`         | `contents: read`         | Minimum needed                                                                 |
| Output                | HTML report artifact     | Reviewed by a human, not parsed by a gate                                      |

## Passive only — and why that is not a limitation to fix

A **passive** baseline scan spiders the target and analyses the responses it already
receives. It sends no attack payloads.

An **active** scan sends crafted malicious requests — injection strings, traversal
attempts, tampered parameters.

**Active scanning is off the table here, and it is not a gap to close.** The targets are
third-party public demo services. Sending attack traffic at infrastructure you do not
own and have no written authorisation to test is unauthorised activity, regardless of
how permissive the site seems or that it exists for demos.

If asked to enable active scanning, say that plainly and offer the alternatives:

- Point the scan at a target you own or have explicit authorisation to test — the
  workflow already takes a `target` input, so no code change is needed.
- Keep passive scanning against the demo target for header and cookie hygiene signal.

Do not soften this into "it's not currently configured." The reason is the
authorisation boundary, and stating it accurately is the professional answer.

## Why it isn't scheduled

Automated recurring scans of third-party infrastructure look like reconnaissance,
whatever the intent. A human dispatching a scan deliberately is defensible; a nightly
job pointed at somebody else's service is not.

Same reasoning as the k6 workflow — see [performance.md](performance.md).

## What it actually catches

Against a third-party site, passive scanning finds response-level hygiene issues:

- Missing or weak security headers — `Content-Security-Policy`,
  `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`.
- Cookie flags — missing `Secure`, `HttpOnly`, `SameSite`.
- Information disclosure in responses — server banners, verbose errors, comments.
- Mixed content and insecure form posts.

Every one of those is a finding _about the target_, not about our code. We cannot fix
them. The value is demonstrating the practice and having the report, which is why the
job is non-gating.

## Rule tuning — `.zap/rules.tsv`

Tab-separated: `<ruleId>	<WARN|FAIL|IGNORE>	<comment>`. Unlisted rules default to
`WARN`.

Currently three rules are set to `IGNORE`:

| Rule    | Name                                         | Why                         |
| ------- | -------------------------------------------- | --------------------------- |
| `10027` | Information Disclosure — Suspicious Comments | Noisy on demo apps          |
| `10096` | Timestamp Disclosure                         | Low signal on a public demo |
| `10109` | Modern Web Application                       | Informational only          |

**Nothing is set to `FAIL`**, on purpose: the scan runs against a target we don't own,
so no finding should break our build.

Rules for changing this file:

- Every `IGNORE` needs a comment justifying it. An unexplained ignore is
  indistinguishable from hiding a finding.
- Do not add an `IGNORE` to quiet a report you haven't read. Read it, decide whether
  the rule is genuinely low-signal _for this target_, then tune.
- Setting a rule to `FAIL` only makes sense against a target we own. If you set one,
  say what changed to justify gating on it.

## Cannot be run locally

ZAP ships as a Docker image, and the workflow uses the GitHub Action wrapper. Running
it locally means pulling a heavy image.

So: this is the one suite that **has never been executed on a developer machine** in
this repo. It executes on dispatch in CI. If asked whether the security scan passes,
the honest answer is to point at a dispatched run's artifact — never to infer a result
from the configuration.

## Verify

There is no local command. To exercise it:

```bash
gh workflow run security.yml -f target=https://www.saucedemo.com
gh run list --workflow=security.yml --limit 5
gh run download <run-id> -n zap-baseline-report
```

The workflow YAML itself is checked by nothing but review — it is not in the `tsc` or
ESLint gate. Read it carefully when editing.

## Checklist

- [ ] The target is one we own, or the scan is passive.
- [ ] Passive baseline only — no active scan against third-party infrastructure.
- [ ] Still `workflow_dispatch`-only; no schedule added.
- [ ] `fail_action: false` unless the target is ours.
- [ ] Any new `IGNORE` in `.zap/rules.tsv` has a comment and a reason.
- [ ] Any claim about scan results cites a real dispatched run, not the config.
