import { createEventInput } from "../../data/event.factory";
import { test, expect } from "../../fixtures/test";

test.describe("Event management", () => {
  test.beforeEach(async ({ appCommands }) => {
    await appCommands.resetState();
  });

  test("authenticated users can publish an event and discover it from search", async ({
    appCommands,
    appShellPage,
    createEventPage,
    dashboardPage,
    loginPage
  }) => {
    const hostUser = await appCommands.createUser({
      name: "Kabir Anand"
    });
    const event = createEventInput();

    await appCommands.seedRegisteredUser(hostUser);

    await loginPage.goto();
    await loginPage.signIn(hostUser.email, hostUser.password);
    await dashboardPage.expectVisible();

    await dashboardPage.openCreateEvent();
    await createEventPage.expectVisible();
    await createEventPage.publishEvent(event);

    await appShellPage.expectToast(`Event published: ${event.name}.`);
    await dashboardPage.expectVisible();
    await dashboardPage.expectPublishedEvent(event.name);

    await dashboardPage.searchEvents(event.city, event.genre);
    await dashboardPage.expectSearchResult(event.name);
  });

  test("authenticated users can request a booking payment link for a matching event", async ({
    appCommands,
    appShellPage,
    bookingDialogPage,
    dashboardPage,
    loginPage
  }) => {
    const attendee = await appCommands.createUser({
      name: "Maya Kapoor"
    });
    const event = appCommands.createOwnedEvent(attendee.email, {
      name: "Coastal Echoes",
      city: "goa",
      genre: "rock",
      date: "2026-05-20",
      venue: "Palm Harbor Stage"
    });

    await appCommands.seedSession({
      users: [attendee],
      events: [event]
    });

    await loginPage.goto();
    await loginPage.signIn(attendee.email, attendee.password);
    await dashboardPage.expectVisible();

    await dashboardPage.searchEvents(event.city, event.genre);
    await dashboardPage.expectSearchResult(event.name);
    await dashboardPage.openBookingFor(event.name, event.date);

    await bookingDialogPage.expectVisible();
    await bookingDialogPage.requestPaymentLink({
      passType: "vip",
      ticketCount: 2,
      email: attendee.email
    });

    await appShellPage.expectToast("Booking created. Check your inbox or Ethereal preview.");
    await expect(dashboardPage.bookingStatus).toContainText("Booking confirmed");
    await expect(dashboardPage.bookingStatus).toContainText(attendee.email);
    await expect(dashboardPage.bookingStatus.getByTestId("booking-status-link-1")).toHaveAttribute(
      "href",
      /https:\/\/payments\.bliss\.test\/checkout\/BK-/
    );
  });
});
