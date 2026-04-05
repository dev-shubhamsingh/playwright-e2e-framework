import type { Page } from "@playwright/test";
import { createOwnedEvent, type EventInput } from "../../data/event.factory";
import { createSignupUser, type SignupUser } from "../../data/user.factory";
import { TestSessionApi } from "../api/test-session.api";
import type { AppEvent, TestSessionOptions } from "../types/app-state";

export class AppCommand {
  constructor(
    private readonly page: Page,
    private readonly testSessionApi: TestSessionApi
  ) {}

  async resetState(): Promise<void> {
    await this.applyStorage();
  }

  async createUser(overrides: Partial<SignupUser> = {}): Promise<SignupUser> {
    return createSignupUser(overrides);
  }

  createOwnedEvent(ownerEmail: string, overrides: Partial<EventInput> = {}): AppEvent {
    return createOwnedEvent(ownerEmail, overrides);
  }

  async seedSession(options: TestSessionOptions = {}): Promise<void> {
    const storage = await this.testSessionApi.createStorage(options);
    await this.applyStorage(storage);
  }

  async seedRegisteredUser(user: SignupUser): Promise<void> {
    await this.seedSession({
      users: [user]
    });
  }

  async seedAuthenticatedUser(user: SignupUser): Promise<void> {
    await this.seedSession({
      users: [user],
      currentUserEmail: user.email
    });
  }

  private async applyStorage(storage: Record<string, string> = {}): Promise<void> {
    await this.page.addInitScript((entries) => {
      window.localStorage.clear();
      for (const [key, value] of Object.entries(entries)) {
        window.localStorage.setItem(key, value);
      }
    }, storage);
  }
}
