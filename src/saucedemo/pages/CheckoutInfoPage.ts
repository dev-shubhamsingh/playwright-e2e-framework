import { type Locator } from '@playwright/test';
import { SauceDemoPage } from './SauceDemoPage';

/**
 * Checkout Step One — customer information (first name, last name, zip code).
 * URL: /checkout-step-one.html
 */
export class CheckoutInfoPage extends SauceDemoPage {
  private readonly firstNameInput: Locator = this.page.getByTestId('firstName');
  private readonly lastNameInput: Locator = this.page.getByTestId('lastName');
  private readonly postalCodeInput: Locator =
    this.page.getByTestId('postalCode');
  private readonly continueButton: Locator = this.page.getByTestId('continue');
  private readonly cancelButton: Locator = this.page.getByTestId('cancel');
  private readonly errorMessage: Locator = this.page.getByTestId('error');

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
  async fillAndContinue(
    firstName: string,
    lastName: string,
    postalCode: string,
  ) {
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
}
