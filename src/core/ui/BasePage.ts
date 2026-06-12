import { type Page } from '@playwright/test';

/**
 * App-agnostic base for all UI page objects.
 *
 * Holds the Playwright `page` (so subclasses skip the field + constructor
 * boilerplate) and provides a relative-path `goto` that resolves against the
 * project `baseURL`. Page objects therefore never hard-code the host — the
 * target environment is controlled entirely by config.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Navigate to a path relative to the configured `baseURL`
   * (e.g. '/inventory.html'). Defaults to the site root.
   */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }
}
