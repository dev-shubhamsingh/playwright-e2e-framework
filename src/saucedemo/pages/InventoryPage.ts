import { type Page, type Locator } from '@playwright/test';

export class InventoryPage {
  // Locators defined as Properties
  private readonly page: Page;
  private readonly productList: Locator;
  private readonly cartIcon: Locator;
  private readonly cartBadge: Locator;
  private readonly sortDropdown: Locator;
  private readonly menuButton: Locator;
  private readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productList    = page.locator('.inventory_item');
    this.cartIcon       = page.getByTestId('shopping-cart-link');
    this.cartBadge      = page.getByTestId('shopping-cart-badge');
    this.sortDropdown   = page.getByTestId('product-sort-container');
    this.menuButton     = page.getByRole('button', { name: 'Open Menu' });
    this.pageTitle      = page.getByTestId('title');
  }

  // Actions as Methods

  /** Navigate directly to the inventory page */
  async goto() {
    await this.page.goto('https://www.saucedemo.com/inventory.html');
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
    const rawPrices = await this.page.getByTestId('inventory-item-price').allInnerTexts();
    // rawPrices look like ['$9.99', '$15.99'] — strip the $ and parse
    return rawPrices.map((p) => parseFloat(p.replace('$', '')));
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
    await this.page.getByTestId('inventory-item-name').filter({ hasText: productName }).click();
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

  /** Get the page title text e.g. "Products" */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }
}
