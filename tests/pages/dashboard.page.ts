import { expect, type Locator, type Page } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly root: Locator;
  readonly searchCitySelect: Locator;
  readonly searchGenreSelect: Locator;
  readonly findEventsButton: Locator;
  readonly searchResultsItems: Locator;
  readonly publishedEventsItems: Locator;
  readonly publishNewEventButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("dashboard-view");
    this.searchCitySelect = page.getByTestId("search-city-select");
    this.searchGenreSelect = page.getByTestId("search-genre-select");
    this.findEventsButton = page.getByTestId("search-submit-button");
    this.searchResultsItems = page.getByTestId("search-results-list").locator("li");
    this.publishedEventsItems = page.getByTestId("published-events-list").locator("li");
    this.publishNewEventButton = page.getByTestId("go-to-create-event-button");
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.page.getByTestId("logout-button").click();
  }
}
