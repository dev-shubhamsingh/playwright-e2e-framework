import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  // Locators defined as Properties
  private readonly page: Page;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page          = page;
    this.usernameInput = page.getByTestId('username');
    this.passwordInput = page.getByTestId('password');
    this.loginButton   = page.getByTestId('login-button');
    this.errorMessage  = page.getByTestId('error');
  }

  // Actions as Methods

  /** Navigate to the login page */
  async goto() {
    await this.page.goto('https://www.saucedemo.com');
  }

  /** Fill credentials and click login */
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /** Get the validation error message text */
  async getErrorMessage(): Promise<string> {
    return this.errorMessage.innerText();
  }

  /** Returns true if the error message is visible */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }
}
