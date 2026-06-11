import { type Page, type Locator } from '@playwright/test';

export class CartPage {
  // Locators defined as Properties
  private readonly page: Page;
  private readonly cartItems: Locator;
  private readonly checkoutButton: Locator;
  private readonly continueShoppingButton: Locator;
  private readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.getByTestId('inventory-item');
    this.checkoutButton = page.getByTestId('checkout');
    this.continueShoppingButton = page.getByTestId('continue-shopping');
    this.pageTitle = page.getByTestId('title');
  }

  // Actions as Methods

  /** Navigate directly to the cart page */
  async goto() {
    await this.page.goto('https://www.saucedemo.com/cart.html');
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
    return rawPrices.map((p) => parseFloat(p.replace('$', '')));
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

  /** Get the page title text e.g. "Your Cart" */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }

  /** Returns true if the cart is empty (no items) */
  async isEmpty(): Promise<boolean> {
    return (await this.cartItems.count()) === 0;
  }
}
