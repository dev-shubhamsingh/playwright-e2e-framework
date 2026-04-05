# Bliss

Bliss is a lightweight event management web app for discovering and publishing live events (concerts, artist shows, raves, and festivals).

This project is built as a practical playground for end-to-end testing workflows.

## Getting Started

### 1. Clone repository

```bash
git clone git@github.com:dev-shubhamsingh/playwright-e2e-framework.git
cd playwright-e2e-framework
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Default `.env` values:

```env
HOST=127.0.0.1
PORT=3000
```

### 4. Build and run

```bash
npm run build
npm start
```

Open in browser: `http://127.0.0.1:3000`

## Development

Run client watch + server together:

```bash
npm run dev
```

## Scripts

- `npm run build` - Build server and client into `dist/`
- `npm run build:server` - Build server TypeScript
- `npm run build:client` - Build client TypeScript and copy client assets
- `npm start` - Run built server using `.env`
- `npm run dev` - Development workflow
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e:headed` - Run Playwright tests in headed mode
- `npm run test:e2e:ui` - Open the Playwright UI runner
- `npm run test:e2e:report` - Open the latest Playwright HTML report
- `npm run typecheck:e2e` - Type-check Playwright config, fixtures, and page objects
- `npm run typecheck` - Type-check server and client

## Project Structure

```text
src/
  server/
    index.ts
  client/
    index.html
    styles.css
    app.ts

dist/
  server/
  client/

tests/
  data/
  e2e/
  fixtures/
  pages/
  utils/
```

## Notes

- `.env` is ignored from version control.
- Use `.env.example` as the template for local setup.
- This project is intentionally simple and focused on complete user flows.

## Playwright

The Playwright framework is scaffolded with:

- `playwright.config.ts` for runner configuration and local web server startup
- `tests/pages/` for page objects
- `tests/fixtures/` for shared fixtures
- `tests/data/` for test factories and static data
- `tests/utils/` for reusable helpers
- `tests/e2e/` for specs when we start adding tests
- `docs/automated-testing-knowledge-base-playwright.md` for project testing standards and best practices

If `PLAYWRIGHT_BASE_URL` is not set, Playwright will boot the local app automatically before test execution.
