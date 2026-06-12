import { type Locator } from '@playwright/test';
import { BasePage } from '@core/ui';

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
export class MenuComponent extends BasePage {
  private readonly menuButton: Locator = this.page.getByRole('button', {
    name: 'Open Menu',
  });
  private readonly closeButton: Locator = this.page.getByRole('button', {
    name: 'Close Menu',
  });
  private readonly allItemsLink: Locator = this.page.getByTestId(
    'inventory-sidebar-link',
  );
  private readonly aboutLink: Locator =
    this.page.getByTestId('about-sidebar-link');
  private readonly logoutLink: Locator = this.page.getByTestId(
    'logout-sidebar-link',
  );
  private readonly resetLink: Locator =
    this.page.getByTestId('reset-sidebar-link');

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
