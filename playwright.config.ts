import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Shared path to the saved authenticated session
const STORAGE_STATE = path.join(process.cwd(), '.auth', 'standard_user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  // Shared settings inherited by all projects
  use: {
    baseURL: process.env.BASE_URL || 'https://www.saucedemo.com',

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
        baseURL: process.env.API_BASE_URL || 'https://dummyjson.com',
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
      testIgnore: ['**/login.spec.ts', '**/auth.setup.ts', '**/dummyjson/**'],
    },

    // ── Cross-browser: authenticated only ─────────────────────────────────
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: ['**/login.spec.ts', '**/auth.setup.ts', '**/dummyjson/**'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: ['**/login.spec.ts', '**/auth.setup.ts', '**/dummyjson/**'],
    },

    // ── Mobile ────────────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: ['**/login.spec.ts', '**/auth.setup.ts', '**/dummyjson/**'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: ['**/login.spec.ts', '**/auth.setup.ts', '**/dummyjson/**'],
    },
  ],

  outputDir: 'test-results/',
});
