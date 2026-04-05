import { expect, type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly root: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly createAccountButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("login-view");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.signInButton = page.getByTestId("login-submit-button");
    this.createAccountButton = page.getByTestId("go-to-signup-button");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await expect(this.root).toBeVisible();
  }

  async openSignup(): Promise<void> {
    await this.createAccountButton.click();
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
