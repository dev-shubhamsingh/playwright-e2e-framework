import { type Page, type Locator } from '@playwright/test';

export class ProductDetailPage {
  // Locators defined as Properties
  private readonly page: Page;
  private readonly productName: Locator;
  private readonly productDescription: Locator;
  private readonly productPrice: Locator;
  private readonly addToCartButton: Locator;
  private readonly removeButton: Locator;
  private readonly backButton: Locator;
  private readonly cartIcon: Locator;
  private readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productName = page.getByTestId('inventory-item-name');
    this.productDescription = page.getByTestId('inventory-item-desc');
    this.productPrice = page.getByTestId('inventory-item-price');
    this.addToCartButton = page.getByRole('button', { name: /add to cart/i });
    this.removeButton = page.getByRole('button', { name: /remove/i });
    this.backButton = page.getByTestId('back-to-products');
    this.cartIcon = page.getByTestId('shopping-cart-link');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
  }

  // Actions as Methods

  /** Get the displayed product name */
  async getName(): Promise<string> {
    return this.productName.innerText();
  }

  /** Get the displayed product description */
  async getDescription(): Promise<string> {
    return this.productDescription.innerText();
  }

  /** Get the displayed price as a number (strips the $ sign) */
  async getPrice(): Promise<number> {
    const raw = await this.productPrice.innerText();
    return parseFloat(raw.replace('$', ''));
  }

  /** Add the product to the cart */
  async addToCart() {
    await this.addToCartButton.click();
  }

  /** Remove the product from the cart (when button shows Remove) */
  async removeFromCart() {
    await this.removeButton.click();
  }

  /** Go back to the products list */
  async goBackToProducts() {
    await this.backButton.click();
  }

  /** Go to the cart page */
  async goToCart() {
    await this.cartIcon.click();
  }

  /** Returns true if the Add To Cart button is visible */
  async isAddToCartVisible(): Promise<boolean> {
    return this.addToCartButton.isVisible();
  }

  /** Returns true if the Remove button is visible */
  async isRemoveVisible(): Promise<boolean> {
    return this.removeButton.isVisible();
  }

  /** Get the current cart badge count */
  async getCartCount(): Promise<number> {
    const text = await this.cartBadge.innerText();
    return parseInt(text, 10);
  }
}
