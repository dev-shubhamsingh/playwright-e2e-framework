# Security Policy

## Scope

This repository is a **test framework**. It ships no runtime service, exposes no
network listener, and stores no user data. The realistic security surface is small
and worth stating precisely:

| Surface           | Consideration                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependencies      | The `devDependencies` tree is the main exposure. Watched by Dependabot (see [`.github/dependabot.yml`](.github/dependabot.yml))                    |
| Credentials       | Test credentials come from `@core/config/env`. The committed defaults are **published demo credentials** for public sandbox services — not secrets |
| CI workflows      | `security.yml` takes a target URL input; `permissions` are minimised per workflow                                                                  |
| Generated reports | `tars-dashboard.html` interpolates test titles into HTML. Titles are escaped (`tars/lib/format.ts`)                                                |
| `.auth/`          | Holds a saved browser session for a public demo account. Gitignored, and must stay so                                                              |

## Reporting a vulnerability

Open a [GitHub security advisory](https://github.com/dev-shubhamsingh/playwright-e2e-framework/security/advisories/new)
rather than a public issue, and allow a few days for a response.

Useful to include: what you found, how to reproduce it, and what an attacker could
actually achieve. A dependency advisory that is unreachable from any code path here
is worth reporting but is not urgent — saying which it is helps.

## Never commit

- Real credentials, tokens, or API keys. Everything goes through
  `@core/config/env`, and `.env` is gitignored.
- The contents of `.auth/`.
- A scan report naming a third-party target's weaknesses.

`.env.example` is the template and holds no real values.

## On scanning third-party targets

The security workflow performs an **OWASP ZAP passive baseline scan only**: it
spiders the target and analyses the responses it already receives. It sends no
attack payloads.

Both default targets — `saucedemo.com` and `dummyjson.com` — are public demo
services **we do not own**.

**Active scanning against them is out of scope and will not be added.** Sending
crafted attack traffic at infrastructure you do not own and have no written
authorisation to test is unauthorised activity, regardless of how permissive the
site appears or that it exists for demonstration purposes.

The workflow reflects that deliberately: `workflow_dispatch` only (never scheduled
— recurring scans of someone else's service look like reconnaissance),
`fail_action: false`, and `allow_issue_writing: false`.

If you want an active scan, point the workflow's `target` input at a host you own or
are authorised to test. No code change is needed.
