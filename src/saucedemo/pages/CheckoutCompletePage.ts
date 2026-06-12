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
  private readonly ponyExpressImage: Locator =
    this.page.getByTestId('pony-express');

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

  /** Returns true if the confirmation image is visible */
  async isConfirmationImageVisible(): Promise<boolean> {
    return this.ponyExpressImage.isVisible();
  }
}
