import { type Locator } from '@playwright/test';
import { BasePage } from '@core/ui';

export class LoginPage extends BasePage {
  private readonly usernameInput: Locator = this.page.getByTestId('username');
  private readonly passwordInput: Locator = this.page.getByTestId('password');
  private readonly loginButton: Locator = this.page.getByTestId('login-button');
  private readonly errorMessage: Locator = this.page.getByTestId('error');

  /** Navigate to the login page (site root). */
  async goto() {
    await super.goto('/');
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
