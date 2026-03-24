import { expect, type Locator, type Page } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly searchCitySelect: Locator;
  readonly searchGenreSelect: Locator;
  readonly findEventsButton: Locator;
  readonly searchResultsItems: Locator;
  readonly publishedEventsItems: Locator;
  readonly publishNewEventButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchCitySelect = page.locator("#search-city");
    this.searchGenreSelect = page.locator("#search-genre");
    this.findEventsButton = page.getByRole("button", { name: "Find Events" });
    this.searchResultsItems = page.locator("#search-results li");
    this.publishedEventsItems = page.locator("#event-list li");
    this.publishNewEventButton = page.getByRole("button", { name: "Publish New Event" });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Event Dashboard" })).toBeVisible();
  }
}
