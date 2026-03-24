import { expect, type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly createAccountButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator("#login-email");
    this.passwordInput = page.locator("#login-password");
    this.signInButton = page.getByRole("button", { name: "Sign In" });
    this.createAccountButton = page.getByRole("button", { name: "Create an account" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await expect(this.page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  }
}
