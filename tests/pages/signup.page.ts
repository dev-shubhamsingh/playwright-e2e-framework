import { expect, type Locator, type Page } from "@playwright/test";
import type { SignupUser } from "../data/user.factory";

export class SignupPage {
  readonly page: Page;
  readonly root: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly citySelect: Locator;
  readonly passwordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("signup-view");
    this.nameInput = page.getByTestId("signup-name-input");
    this.emailInput = page.getByTestId("signup-email-input");
    this.phoneInput = page.getByTestId("signup-phone-input");
    this.dateOfBirthInput = page.getByTestId("signup-dob-input");
    this.citySelect = page.getByTestId("signup-city-select");
    this.passwordInput = page.getByTestId("signup-password-input");
    this.termsCheckbox = page.getByTestId("signup-terms-checkbox");
    this.submitButton = page.getByTestId("signup-submit-button");
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async signUp(user: SignupUser): Promise<void> {
    await this.nameInput.fill(user.name);
    await this.emailInput.fill(user.email);
    await this.phoneInput.fill(user.phone);
    await this.dateOfBirthInput.evaluate((element, value) => {
      (element as HTMLInputElement).value = value;
    }, user.dob);
    await this.citySelect.selectOption(user.city);
    await this.page.getByTestId(`signup-interest-${user.interest.replace(/_/g, "-")}`).check();
    for (const notification of user.notifications) {
      await this.page.getByTestId(`signup-notification-${notification}`).check();
    }
    await this.page.getByTestId("signup-genres-select").selectOption(user.genres);
    await this.page.getByTestId("signup-bio-input").fill(user.bio);
    await this.passwordInput.fill(user.password);
    await this.termsCheckbox.check();
    await this.submitButton.click();
  }
}
