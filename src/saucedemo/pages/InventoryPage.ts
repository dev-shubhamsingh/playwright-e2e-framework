import { type Locator } from '@playwright/test';
import { parsePrice } from '@shared/utils';
import { SauceDemoPage } from './SauceDemoPage';

export class InventoryPage extends SauceDemoPage {
  private readonly productList: Locator = this.page.locator('.inventory_item');
  private readonly cartIcon: Locator =
    this.page.getByTestId('shopping-cart-link');
  private readonly cartBadge: Locator = this.page.getByTestId(
    'shopping-cart-badge',
  );
  private readonly sortDropdown: Locator = this.page.getByTestId(
    'product-sort-container',
  );
  private readonly menuButton: Locator = this.page.getByRole('button', {
    name: 'Open Menu',
  });

  /** Navigate directly to the inventory page */
  async goto() {
    await super.goto('/inventory.html');
  }

  /** Get the number of products currently displayed */
  async getProductCount(): Promise<number> {
    return this.productList.count();
  }

  /** Get an array of all product names on the page */
  async getProductNames(): Promise<string[]> {
    return this.page.getByTestId('inventory-item-name').allInnerTexts();
  }

  /** Get an array of all product prices as numbers */
  async getProductPrices(): Promise<number[]> {
    const rawPrices = await this.page
      .getByTestId('inventory-item-price')
      .allInnerTexts();
    // rawPrices look like ['$9.99', '$15.99']
    return rawPrices.map((p) => parsePrice(p));
  }

  /** Add a product to cart by its exact name */
  async addToCartByName(productName: string) {
    const product = this.page
      .getByTestId('inventory-item')
      .filter({ hasText: productName });
    await product.getByRole('button', { name: /add to cart/i }).click();
  }

  /** Remove a product from cart by its exact name (when already added) */
  async removeFromCartByName(productName: string) {
    const product = this.page
      .getByTestId('inventory-item')
      .filter({ hasText: productName });
    await product.getByRole('button', { name: /remove/i }).click();
  }

  /** Click a product name to go to its detail page */
  async openProductByName(productName: string) {
    await this.page
      .getByTestId('inventory-item-name')
      .filter({ hasText: productName })
      .click();
  }

  /** Sort products using the dropdown */
  async sortBy(option: 'az' | 'za' | 'lohi' | 'hilo') {
    await this.sortDropdown.selectOption(option);
  }

  /** Get the current cart badge count (number of items in cart) */
  async getCartCount(): Promise<number> {
    const text = await this.cartBadge.innerText();
    return parseInt(text, 10);
  }

  /** Returns true if the cart badge is visible */
  async isCartBadgeVisible(): Promise<boolean> {
    return this.cartBadge.isVisible();
  }

  /** Navigate to the cart page */
  async goToCart() {
    await this.cartIcon.click();
  }

  /** Open the hamburger side menu */
  async openMenu() {
    await this.menuButton.click();
  }
}
