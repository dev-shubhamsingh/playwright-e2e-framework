import { type Page, type Locator } from '@playwright/test';

/**
 * Checkout Step One — customer information (first name, last name, zip code).
 * URL: /checkout-step-one.html
 */
export class CheckoutInfoPage {
  // Locators defined as Properties
  private readonly page: Page;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly postalCodeInput: Locator;
  private readonly continueButton: Locator;
  private readonly cancelButton: Locator;
  private readonly errorMessage: Locator;
  private readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page             = page;
    this.firstNameInput   = page.getByTestId('firstName');
    this.lastNameInput    = page.getByTestId('lastName');
    this.postalCodeInput  = page.getByTestId('postalCode');
    this.continueButton   = page.getByTestId('continue');
    this.cancelButton     = page.getByTestId('cancel');
    this.errorMessage     = page.getByTestId('error');
    this.pageTitle        = page.getByTestId('title');
  }

  // Actions as Methods

  /** Fill in all customer information fields */
  async fillInfo(firstName: string, lastName: string, postalCode: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  /** Click Continue to proceed to the order overview */
  async continue() {
    await this.continueButton.click();
  }

  /** Click Cancel to go back to the cart */
  async cancel() {
    await this.cancelButton.click();
  }

  /** Fill info and immediately continue — convenience method for happy-path tests */
  async fillAndContinue(firstName: string, lastName: string, postalCode: string) {
    await this.fillInfo(firstName, lastName, postalCode);
    await this.continue();
  }

  /** Get the validation error message text */
  async getErrorMessage(): Promise<string> {
    return this.errorMessage.innerText();
  }

  /** Returns true if the error message container is visible */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /** Get the page title text e.g. "Checkout: Your Information" */
  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText();
  }
}
