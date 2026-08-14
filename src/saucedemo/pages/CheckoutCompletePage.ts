import { type Locator } from '@playwright/test';
import { SauceDemoPage } from './SauceDemoPage';

/**
 * Checkout Complete — order confirmation screen.
 * URL: /checkout-complete.html
 */
export class CheckoutCompletePage extends SauceDemoPage {
  private readonly confirmationHeader: Locator =
    this.page.getByTestId('complete-header');
  private readonly confirmationText: Locator =
    this.page.getByTestId('complete-text');
  private readonly backHomeButton: Locator =
    this.page.getByTestId('back-to-products');
  /**
   * The order-confirmation image. Exposed as a `Locator` (rather than behind a
   * boolean helper) so specs can assert on it web-first with
   * `await expect(page.confirmationImage).toBeVisible()`.
   *
   * This matters here specifically: it is an `<img>`, so until its resource
   * loads it has zero height and is correctly reported as not visible. A
   * one-shot `isVisible()` read races the image load; a web-first assertion
   * retries until layout settles.
   */
  readonly confirmationImage: Locator = this.page.getByTestId('pony-express');

  /** Get the confirmation header text e.g. "Thank you for your order!" */
  async getConfirmationHeader(): Promise<string> {
    return this.confirmationHeader.innerText();
  }

  /** Get the confirmation body text */
  async getConfirmationText(): Promise<string> {
    return this.confirmationText.innerText();
  }

  /** Click Back Home to return to the inventory page */
  async backToHome() {
    await this.backHomeButton.click();
  }
}
