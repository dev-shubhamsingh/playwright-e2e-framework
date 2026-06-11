import { test as setup } from '@playwright/test';
import { LoginPage } from '@saucedemo/pages/LoginPage';
import path from 'path';

/**
 * Authentication setup — the MODERN Playwright pattern (setup project).
 *
 * This runs as a real test (it shows in the report and trace viewer) before
 * any authenticated tests, via `dependencies: ['setup']` in playwright.config.
 *
 * Why this beats the old globalSetup approach:
 *   - Reuses the LoginPage page object → DRY, no duplicated selectors
 *   - testIdAttribute: 'data-test' applies here (it didn't in a raw context)
 *   - Visible in the HTML report / trace if it ever fails
 *   - Scoped to the SauceDemo module — lives beside the tests it serves
 *
 * It logs in once and saves the session to .auth/standard_user.json.
 * Every authenticated project loads that file as storageState.
 */
const authFile = path.join(process.cwd(), '.auth', 'standard_user.json');

setup('authenticate as standard_user', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(
    process.env.TEST_USER ?? 'standard_user',
    process.env.TEST_PASSWORD ?? 'secret_sauce'
  );

  // Confirm we actually reached the inventory page before saving state
  await page.waitForURL('**/inventory.html');

  // Persist cookies + localStorage for reuse by authenticated projects
  await page.context().storageState({ path: authFile });
});
