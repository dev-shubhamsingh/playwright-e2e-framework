import { expect, type Locator, type Page } from "@playwright/test";

export type BookingRequest = {
  passType: string;
  ticketCount: number;
  email: string;
};

export class BookingDialogPage {
  readonly page: Page;
  readonly root: Locator;
  readonly passTypeSelect: Locator;
  readonly ticketCountInput: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("booking-dialog");
    this.passTypeSelect = page.getByTestId("booking-pass-type-select");
    this.ticketCountInput = page.getByTestId("booking-ticket-count-input");
    this.emailInput = page.getByTestId("booking-email-input");
    this.submitButton = page.getByTestId("booking-submit-button");
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async requestPaymentLink(request: BookingRequest): Promise<void> {
    await this.passTypeSelect.selectOption(request.passType);
    await this.ticketCountInput.fill(String(request.ticketCount));
    await this.emailInput.fill(request.email);
    await this.submitButton.click();
  }
}
