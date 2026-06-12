import { type Locator } from '@playwright/test';
import { parsePrice } from '@shared/utils';
import { SauceDemoPage } from './SauceDemoPage';

export class CartPage extends SauceDemoPage {
  private readonly cartItems: Locator = this.page.getByTestId('inventory-item');
  private readonly checkoutButton: Locator = this.page.getByTestId('checkout');
  private readonly continueShoppingButton: Locator =
    this.page.getByTestId('continue-shopping');

  /** Navigate directly to the cart page */
  async goto() {
    await super.goto('/cart.html');
  }

  /** Get the number of items currently in the cart */
  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  /** Get an array of all item names in the cart */
  async getItemNames(): Promise<string[]> {
    return this.page.getByTestId('inventory-item-name').allInnerTexts();
  }

  /** Get an array of all item prices in the cart as numbers */
  async getItemPrices(): Promise<number[]> {
    const rawPrices = await this.page
      .getByTestId('inventory-item-price')
      .allInnerTexts();
    return rawPrices.map((p) => parsePrice(p));
  }

  /** Get the quantity of a specific item by its name */
  async getItemQuantity(itemName: string): Promise<number> {
    const item = this.cartItems.filter({ hasText: itemName });
    const qty = await item.getByTestId('item-quantity').innerText();
    return parseInt(qty, 10);
  }

  /** Remove a specific item from the cart by name */
  async removeItem(itemName: string) {
    const item = this.cartItems.filter({ hasText: itemName });
    await item.getByRole('button', { name: /remove/i }).click();
  }

  /** Proceed to checkout */
  async checkout() {
    await this.checkoutButton.click();
  }

  /** Go back to continue shopping */
  async continueShopping() {
    await this.continueShoppingButton.click();
  }

  /** Returns true if the cart is empty (no items) */
  async isEmpty(): Promise<boolean> {
    return (await this.cartItems.count()) === 0;
  }
}
