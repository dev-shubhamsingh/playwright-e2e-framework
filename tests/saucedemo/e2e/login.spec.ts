import { baseTest as test, expect } from '@saucedemo/fixtures';
import { USERS, INVALID_CREDENTIALS } from '@saucedemo/data/users';

/**
 * Login Test Suite — covers all login scenarios on SauceDemo.
 *
 * Structure:
 *   ✅ Positive — valid users that should reach inventory
 *   ❌ Negative — invalid credentials that should show errors
 *   🔒 Locked out — specific error for blocked accounts
 *   🐢 Performance — slow login still lands on inventory
 */
test.describe('Login', { tag: '@regression' }, () => {
  // Navigate to login page before every test in this file
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  // ─────────────────────────────────────────────
  // POSITIVE TESTS
  // ─────────────────────────────────────────────
  test.describe('Valid credentials', () => {
    test(
      'standard user can log in and reach inventory',
      { tag: '@smoke' },
      async ({ loginPage, page }) => {
        await test.step('Enter credentials', async () => {
          await loginPage.login(
            USERS.standard.username,
            USERS.standard.password,
          );
        });

        await test.step('Verify redirect to inventory page', async () => {
          await expect(page).toHaveURL(/inventory/);
          await expect(page.getByTestId('title')).toHaveText('Products');
        });
      },
    );

    test('performance glitch user logs in successfully (within timeout)', async ({
      loginPage,
      page,
    }) => {
      // Playwright default timeout is 30s — more than enough for the ~5s delay
      await test.step('Enter credentials', async () => {
        await loginPage.login(
          USERS.performanceGlitch.username,
          USERS.performanceGlitch.password,
        );
      });

      await test.step('Verify redirect despite slow response', async () => {
        await expect(page).toHaveURL(/inventory/, { timeout: 10_000 });
      });
    });
  });

  // ─────────────────────────────────────────────
  // NEGATIVE TESTS — data-driven with test.each
  // ─────────────────────────────────────────────
  test.describe('Invalid credentials', () => {
    /**
     * test.each lets you run the same test logic with different data.
     * Each entry in INVALID_CREDENTIALS becomes a separate test case.
     * The test name auto-fills from the object fields.
     */
    for (const { username, password, expectedError } of INVALID_CREDENTIALS) {
      test(`shows error — username: "${username || '(empty)'}" password: "${password || '(empty)'}"`, async ({
        loginPage,
      }) => {
        await test.step('Submit invalid credentials', async () => {
          await loginPage.login(username, password);
        });

        await test.step('Verify error message is shown', async () => {
          expect(await loginPage.hasError()).toBe(true);
          expect(await loginPage.getErrorMessage()).toContain(expectedError);
        });
      });
    }
  });

  // ─────────────────────────────────────────────
  // LOCKED OUT USER
  // ─────────────────────────────────────────────
  test.describe('Locked out user', () => {
    test('shows locked out error message', async ({ loginPage, page }) => {
      await test.step('Attempt login as locked out user', async () => {
        await loginPage.login(
          USERS.lockedOut.username,
          USERS.lockedOut.password,
        );
      });

      await test.step('Verify still on login page with correct error', async () => {
        // Should NOT navigate away
        await expect(page).toHaveURL('https://www.saucedemo.com/');

        // Should show the specific locked-out error
        expect(await loginPage.hasError()).toBe(true);
        expect(await loginPage.getErrorMessage()).toContain(
          'Sorry, this user has been locked out',
        );
      });
    });
  });

  // ─────────────────────────────────────────────
  // SESSION / NAVIGATION TESTS
  // ─────────────────────────────────────────────
  test.describe('Session behaviour', () => {
    test('cannot access inventory page without logging in', async ({
      page,
    }) => {
      await test.step('Navigate directly to inventory', async () => {
        await page.goto('/inventory.html');
      });

      await test.step('Verify redirect back to login', async () => {
        await expect(page).toHaveURL('https://www.saucedemo.com/');
      });
    });
  });
});
