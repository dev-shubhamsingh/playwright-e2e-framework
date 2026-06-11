import { type Page, type Locator } from '@playwright/test';

/**
 * Checkout Step Two — order summary/overview before placing the order.
 * URL: /checkout-step-two.html
 */
export class CheckoutOverviewPage {
  // Locators defined as Properties
  private readonly page: Page;
  private readonly cartItems: Locator;
  private readonly itemTotal: Locator;
  private readonly taxAmount: Locator;
  private readonly orderTotal: Locator;
  private readonly finishButton: Locator;
  private readonly cancelButton: Locator;
  private readonly pageTitle: Locator;
  private readonly paymentInfo: Locator;
  private readonly shippingInfo: Locator;

  constructor(page: Page) {
    this.page         = page;
    this.cartItems    = page.getByTestId('inventory-item');
    this.itemTotal    = page.getByTestId('subtotal-label');
    this.taxAmount    = page.getByTestId('tax-label');
    this.orderTotal   = page.getByTestId('total-label');
    this.finishButton = page.getByTestId('finish');
    this.cancelButton = page.getByTestId('cancel');
    this.pageTitle    = page.getByTestId('title');
    this.paymentInfo  = page.getByTestId('payment-info-value');
    this.shippingInfo = page.getByTestId('shipping-info-value');
  }

  // Actions as Methods

  /** Get the number of items in the order summary */
  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  /** Get all item names in the summary */
  async getItemNames(): Promise<string[]> {
    return this.page.getByTestId('inventory-item-name').allInnerTexts();
  }

  /** Get the item subtotal as a number (e.g. 29.98) */
  async getItemTotal(): Promise<number> {
    const raw = await this.itemTotal.innerText();
    // text looks like "Item total: $29.98"
    const match = raw.match(/\$([0-9.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /** Get the tax amount as a number */
  async getTax(): Promise<number> {
    const raw = await this.taxAmount.innerText();
    const match = raw.match(/\$([0-9.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /** Get the order total as a number */
  async getOrderTotal(): Promise<number> {
    const raw = await this.orderTotal.innerText();
    const match = raw.match(/\$([0-9.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /** Get the payment information text */
  async getPaymentInfo(): Promise<string> {
    return this.paymentInfo.innerText();
  }

  /** Get the shipping information text */
  async getShippingInfo(): Promise<string> {
    return this.shippingInfo.innerText();
  }

  /** Place the order by clicking Finish */
  async finish() {
    await this.finishButton.click();
  }

  /** Cancel and go back to inventory */
  async cancel() {
    await this.cancelButton.click();
  }

  /** Get the page title text e.g. "Checkout: Overview" */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }
}
