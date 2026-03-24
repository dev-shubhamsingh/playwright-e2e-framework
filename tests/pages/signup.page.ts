import { expect, type Locator, type Page } from "@playwright/test";

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
    this.root = page.locator("#signup-view");
    this.nameInput = page.locator("#signup-name");
    this.emailInput = page.locator("#signup-email");
    this.phoneInput = page.locator("#signup-phone");
    this.dateOfBirthInput = page.locator("#signup-dob");
    this.citySelect = page.locator("#signup-city");
    this.passwordInput = page.locator("#signup-password");
    this.termsCheckbox = page.locator("#signup-terms");
    this.submitButton = page.getByRole("button", { name: "Create Account" });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Create Your Bliss Account" })).toBeVisible();
  }
}
