import { type Locator } from '@playwright/test';
import { BasePage } from '@core/ui';

/**
 * Base for SauceDemo pages that render the standard header title
 * (`data-test="title"`) — e.g. "Products", "Your Cart", "Checkout: Overview".
 *
 * Extends the app-agnostic core `BasePage` and adds the one piece of markup
 * those pages share, so `getPageTitle()` lives in exactly one place.
 */
export abstract class SauceDemoPage extends BasePage {
  protected readonly pageTitle: Locator = this.page.getByTestId('title');

  /** The header title text for the current page. */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }
}
