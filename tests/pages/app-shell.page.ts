import { expect, type Locator, type Page } from "@playwright/test";

export class AppShellPage {
  readonly page: Page;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toast = page.getByTestId("app-toast");
  }

  async expectToast(message: string): Promise<void> {
    await expect(this.toast).toContainText(message);
  }
}
