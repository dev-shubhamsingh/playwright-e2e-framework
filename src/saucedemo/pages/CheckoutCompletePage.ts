import { type Page, type Locator } from '@playwright/test';

/**
 * Checkout Complete — order confirmation screen.
 * URL: /checkout-complete.html
 */
export class CheckoutCompletePage {
  // Locators defined as Properties
  private readonly page: Page;
  private readonly confirmationHeader: Locator;
  private readonly confirmationText: Locator;
  private readonly backHomeButton: Locator;
  private readonly ponyExpressImage: Locator;
  private readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page                = page;
    this.confirmationHeader  = page.getByTestId('complete-header');
    this.confirmationText    = page.getByTestId('complete-text');
    this.backHomeButton      = page.getByTestId('back-to-products');
    this.ponyExpressImage    = page.getByTestId('pony-express');
    this.pageTitle           = page.getByTestId('title');
  }

  // Actions as Methods

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

  /** Get the page title text e.g. "Checkout: Complete!" */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }
}
