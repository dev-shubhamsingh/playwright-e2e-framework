import { type Locator } from '@playwright/test';
import { parsePrice } from '@shared/utils';
import { SauceDemoPage } from './SauceDemoPage';

/**
 * Checkout Step Two — order summary/overview before placing the order.
 * URL: /checkout-step-two.html
 */
export class CheckoutOverviewPage extends SauceDemoPage {
  /** The order line items. Public for `toHaveCount` assertions. */
  readonly cartItems: Locator = this.page.getByTestId('inventory-item');
  /** Subtotal label. Public for `toHaveText` / `toContainText`. */
  readonly itemTotal: Locator = this.page.getByTestId('subtotal-label');
  /** Tax label. Public for `toHaveText` / `toContainText`. */
  readonly taxAmount: Locator = this.page.getByTestId('tax-label');
  /** Order-total label. Public for `toHaveText` / `toContainText`. */
  readonly orderTotal: Locator = this.page.getByTestId('total-label');
  private readonly finishButton: Locator = this.page.getByTestId('finish');
  private readonly cancelButton: Locator = this.page.getByTestId('cancel');
  private readonly paymentInfo: Locator =
    this.page.getByTestId('payment-info-value');
  private readonly shippingInfo: Locator = this.page.getByTestId(
    'shipping-info-value',
  );

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
    // text looks like "Item total: $29.98"
    return parsePrice(await this.itemTotal.innerText());
  }

  /** Get the tax amount as a number */
  async getTax(): Promise<number> {
    return parsePrice(await this.taxAmount.innerText());
  }

  /** Get the order total as a number */
  async getOrderTotal(): Promise<number> {
    return parsePrice(await this.orderTotal.innerText());
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
}
