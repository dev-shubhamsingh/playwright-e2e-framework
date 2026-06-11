import { type Page, type Locator } from '@playwright/test';

/**
 * MenuComponent — the hamburger side menu accessible from any page after login.
 * This is a component (not a full page) because it overlays on top of existing pages.
 *
 * Links available:
 * - All Items      → /inventory.html
 * - About          → saucelabs.com
 * - Logout         → /
 * - Reset App State → clears cart
 */
export class MenuComponent {
  // Locators defined as Properties
  private readonly page: Page;
  private readonly menuButton: Locator;
  private readonly closeButton: Locator;
  private readonly allItemsLink: Locator;
  private readonly aboutLink: Locator;
  private readonly logoutLink: Locator;
  private readonly resetLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.menuButton = page.getByRole('button', { name: 'Open Menu' });
    this.closeButton = page.getByRole('button', { name: 'Close Menu' });
    this.allItemsLink = page.getByTestId('inventory-sidebar-link');
    this.aboutLink = page.getByTestId('about-sidebar-link');
    this.logoutLink = page.getByTestId('logout-sidebar-link');
    this.resetLink = page.getByTestId('reset-sidebar-link');
  }

  // Actions as Methods

  /** Open the hamburger menu */
  async open() {
    await this.menuButton.click();
    // Wait for the menu to slide in and links to be visible
    await this.allItemsLink.waitFor({ state: 'visible' });
  }

  /** Close the hamburger menu */
  async close() {
    await this.closeButton.click();
    await this.allItemsLink.waitFor({ state: 'hidden' });
  }

  /** Navigate to All Items (inventory page) */
  async goToAllItems() {
    await this.open();
    await this.allItemsLink.click();
  }

  /** Navigate to the About page (saucelabs.com) */
  async goToAbout() {
    await this.open();
    await this.aboutLink.click();
  }

  /** Logout — returns to the login page */
  async logout() {
    await this.open();
    await this.logoutLink.click();
  }

  /** Reset app state — clears the cart and resets product button states */
  async resetAppState() {
    await this.open();
    await this.resetLink.click();
    await this.close();
  }
}
