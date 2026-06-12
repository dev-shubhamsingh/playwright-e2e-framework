# TARS — Framework Architecture

> Version-controlled mirror of `.kiro/steering/framework-architecture.md` (the
> file Kiro loads). Kept in sync.

Playwright + TypeScript test framework. The git repo lives in the `playwright/`
subfolder of the workspace. Run all commands from there (`cd playwright`).

## Layout

```
playwright/
  src/
    core/                  # app-agnostic framework code
      config/              # env.ts — typed, zod-validated environment loader
      http/                # ApiClient base: typed get/post/..., retry/backoff
                           #   on 429/503, request+response report attachments
      ui/                  # BasePage: page handle + relative-path goto(baseURL)
    saucedemo/             # UI domain: pages/ (+ SauceDemoPage base), fixtures/, data/
    dummyjson/             # API domain: clients/, schemas/, fixtures/, data/
    shared/utils/          # helpers, faker test-data factory
  tests/
    saucedemo/             # UI specs (e2e/, visual/, a11y/) + auth.setup.ts
    dummyjson/             # API integration + contract + performance specs
  playwright.config.ts     # projects, reporters, browsers
  tsconfig.json            # strict + path aliases
```

Test types for a domain live under `tests/<domain>/<type>/` — e.g.
`tests/dummyjson/{api,contract,performance}`.

## API clients

Every resource client extends the shared `@core/http` `ApiClient`. Do NOT wrap
`APIRequestContext` directly. `ApiClient` provides typed `get/post/put/patch/
delete` helpers (with query-param support), automatic retry/backoff on transient
statuses, and request/response attachment to the report. Clients return the raw
`APIResponse`; specs own the status and body assertions and validate bodies
against zod schemas.

## Page objects

Every UI page object extends `@core/ui` `BasePage`, which holds the Playwright
`page` and provides a relative-path `goto()` resolved against `baseURL` — never
hard-code the host. SauceDemo pages that show the standard header title
(`data-test="title"`) extend `SauceDemoPage` (which extends `BasePage`) for a
shared `getPageTitle()`. Define locators as `readonly` property initializers,
not in a constructor. Reuse `@shared/utils` helpers instead of re-implementing.

## Path aliases (tsconfig)

- `@core/*` → `src/core/*`
- `@config/*` → `src/core/config/*`
- `@saucedemo/*` → `src/saucedemo/*`
- `@dummyjson/*` → `src/dummyjson/*`
- `@shared/*` → `src/shared/*`

Always use aliases in imports; never `../../../`.

## Configuration

All environment access goes through `@core/config/env` — a zod-validated `env`
object with documented defaults that fail fast on misconfiguration. Domain
config modules are thin views over `env`. Never read `process.env` directly.

## Quality gates

- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` / `lint:fix` — ESLint (flat config) + Playwright plugin
- `npm run format` / `format:check` — Prettier
- Pre-commit: husky + lint-staged auto-fix staged files.

Run typecheck, lint, and the relevant test project before declaring a task done.

## Conventions

- Strict TypeScript, no `any` unless justified with a comment.
- Single quotes, semicolons, trailing commas, 80-col width (Prettier-enforced).
- Conventional commits (`feat:`, `fix:`, `test:`, `build:`, `chore:`, `docs:`,
  `style:`, `refactor:`).
