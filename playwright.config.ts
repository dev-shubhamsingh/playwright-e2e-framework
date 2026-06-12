import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { env } from './src/core/config/env';

// Shared path to the saved authenticated session
const STORAGE_STATE = path.join(process.cwd(), '.auth', 'standard_user.json');

// Specs the cross-browser UI projects must NOT run: the login flow (needs a
// clean session), the setup file, API specs, and the specialised visual /
// accessibility suites (each has its own dedicated, Chromium-only project).
const UI_TEST_IGNORE = [
  '**/login.spec.ts',
  '**/auth.setup.ts',
  '**/dummyjson/**',
  '**/visual/**',
  '**/a11y/**',
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['allure-playwright', { outputFolder: 'allure-results', detail: true }],
    // TARS Mission Control — quality intelligence brief on every run.
    ['./tars/reporter/TarsReporter.ts'],
  ],

  // Shared settings inherited by all projects
  use: {
    baseURL: env.BASE_URL,

    // SauceDemo uses data-test="..." not data-testid
    testIdAttribute: 'data-test',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // ── SETUP: authenticate once, save session to .auth/ ──────────────────
    // Modern pattern: a real test (visible in reports) that other projects
    // depend on. Reuses the LoginPage page object.
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },

    // ── API: DummyJSON integration tests ──────────────────────────────────
    // No browser — uses Playwright's request fixture only. Independent baseURL
    // and no dependency on the UI auth setup.
    {
      name: 'api',
      testMatch: '**/dummyjson/api/**/*.spec.ts',
      use: {
        baseURL: env.API_BASE_URL,
      },
    },

    // ── Login tests ───────────────────────────────────────────────────────
    // Clean, unauthenticated browser — tests the login flow itself.
    // Does NOT depend on setup (it must start logged out).
    {
      name: 'login',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/login.spec.ts',
    },

    // ── Authenticated tests (Chromium) ────────────────────────────────────
    // Depends on `setup` → session is guaranteed saved before these run.
    // Loads storageState so every test starts already logged in.
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
      testIgnore: UI_TEST_IGNORE,
    },

    // ── Cross-browser: authenticated only ─────────────────────────────────
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: UI_TEST_IGNORE,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: UI_TEST_IGNORE,
    },

    // ── Mobile ────────────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: UI_TEST_IGNORE,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: UI_TEST_IGNORE,
    },

    // ── Visual regression (Chromium only) ─────────────────────────────────
    // Pixel snapshots are OS/browser-specific, so visual runs on a single
    // engine. Baselines live next to the specs in __screenshots__ /
    // *-snapshots and are committed; regenerate with `npm run test:visual:update`.
    {
      name: 'visual',
      testDir: './tests/saucedemo/visual',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },

    // ── Accessibility (Chromium only) ─────────────────────────────────────
    // axe-core WCAG scans of the authenticated SauceDemo pages.
    {
      name: 'a11y',
      testDir: './tests/saucedemo/a11y',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],

  outputDir: 'test-results/',
});
