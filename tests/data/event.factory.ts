import type { AppEvent } from "../support/types/app-state";
import { isoDateFromToday } from "../utils/date";

export type EventInput = Omit<AppEvent, "owner">;

export function createEventInput(overrides: Partial<EventInput> = {}): EventInput {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;

  return {
    id: `event-${uniqueId}`,
    name: `Sunset Sessions ${uniqueId}`,
    city: "goa",
    genre: "rock",
    date: isoDateFromToday(14),
    venue: "Harbor Lights Arena",
    ...overrides
  };
}

export function createOwnedEvent(
  ownerEmail: string,
  overrides: Partial<EventInput> = {}
): AppEvent {
  return {
    ...createEventInput(overrides),
    owner: ownerEmail
  };
}
