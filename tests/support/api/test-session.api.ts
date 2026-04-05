import { expect, type APIRequestContext } from "@playwright/test";
import type { TestSessionOptions } from "../types/app-state";

type TestSessionResponse = {
  ok: boolean;
  error?: string;
  storage?: Record<string, string>;
};

export class TestSessionApi {
  constructor(private readonly request: APIRequestContext) {}

  async createStorage(options: TestSessionOptions = {}): Promise<Record<string, string>> {
    const response = await this.request.post("/api/test/session", {
      data: options
    });
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as TestSessionResponse;
    expect(body.ok).toBeTruthy();
    expect(body.storage).toBeDefined();

    return body.storage ?? {};
  }
}
