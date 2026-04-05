import { expect, type Locator, type Page } from "@playwright/test";
import type { EventInput } from "../data/event.factory";

export class CreateEventPage {
  readonly page: Page;
  readonly root: Locator;
  readonly nameInput: Locator;
  readonly citySelect: Locator;
  readonly genreSelect: Locator;
  readonly dateInput: Locator;
  readonly venueInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("create-event-view");
    this.nameInput = page.getByTestId("event-name-input");
    this.citySelect = page.getByTestId("event-city-select");
    this.genreSelect = page.getByTestId("event-genre-select");
    this.dateInput = page.getByTestId("event-date-input");
    this.venueInput = page.getByTestId("event-venue-input");
    this.submitButton = page.getByTestId("publish-event-submit-button");
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async publishEvent(event: EventInput): Promise<void> {
    await this.nameInput.fill(event.name);
    await this.citySelect.selectOption(event.city);
    await this.genreSelect.selectOption(event.genre);
    await this.dateInput.evaluate((element, value) => {
      (element as HTMLInputElement).value = value;
    }, event.date);
    await this.venueInput.fill(event.venue);
    await this.submitButton.click();
  }
}
