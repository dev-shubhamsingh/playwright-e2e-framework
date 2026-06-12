import { type Locator } from '@playwright/test';
import { BasePage } from '@core/ui';

export class ProductDetailPage extends BasePage {
  private readonly productName: Locator = this.page.getByTestId(
    'inventory-item-name',
  );
  private readonly productDescription: Locator = this.page.getByTestId(
    'inventory-item-desc',
  );
  private readonly productPrice: Locator = this.page.getByTestId(
    'inventory-item-price',
  );
  private readonly addToCartButton: Locator = this.page.getByRole('button', {
    name: /add to cart/i,
  });
  private readonly removeButton: Locator = this.page.getByRole('button', {
    name: /remove/i,
  });
  private readonly backButton: Locator =
    this.page.getByTestId('back-to-products');
  private readonly cartIcon: Locator =
    this.page.getByTestId('shopping-cart-link');
  private readonly cartBadge: Locator = this.page.getByTestId(
    'shopping-cart-badge',
  );

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
