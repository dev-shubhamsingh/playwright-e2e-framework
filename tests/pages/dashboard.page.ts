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
  readonly bookingStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("dashboard-view");
    this.searchCitySelect = page.getByTestId("search-city-select");
    this.searchGenreSelect = page.getByTestId("search-genre-select");
    this.findEventsButton = page.getByTestId("search-submit-button");
    this.searchResultsItems = page.getByTestId("search-results-list").locator("li");
    this.publishedEventsItems = page.getByTestId("published-events-list").locator("li");
    this.publishNewEventButton = page.getByTestId("go-to-create-event-button");
    this.bookingStatus = page.getByTestId("booking-status");
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.page.getByTestId("logout-button").click();
  }

  async openCreateEvent(): Promise<void> {
    await this.publishNewEventButton.click();
  }

  async searchEvents(city: string, genre: string): Promise<void> {
    await this.searchCitySelect.selectOption(city);
    await this.searchGenreSelect.selectOption(genre);
    await this.findEventsButton.click();
  }

  async expectPublishedEvent(name: string): Promise<void> {
    await expect(this.publishedEventsItems.filter({ hasText: name })).toHaveCount(1);
  }

  async expectSearchResult(name: string): Promise<void> {
    await expect(this.searchResultsItems.filter({ hasText: name })).toHaveCount(1);
  }

  async openBookingFor(eventName: string, eventDate: string): Promise<void> {
    const eventKey = `${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${eventDate}`;
    await this.page.getByTestId(`book-event-${eventKey}`).click();
  }
}
