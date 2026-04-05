import { test as base, expect } from "@playwright/test";
import { AppShellPage } from "../pages/app-shell.page";
import { BookingDialogPage } from "../pages/booking-dialog.page";
import { CreateEventPage } from "../pages/create-event.page";
import { DashboardPage } from "../pages/dashboard.page";
import { LoginPage } from "../pages/login.page";
import { SignupPage } from "../pages/signup.page";
import { TestSessionApi } from "../support/api/test-session.api";
import { AppCommand } from "../support/commands/app.command";

type AppFixtures = {
  appCommands: AppCommand;
  appShellPage: AppShellPage;
  bookingDialogPage: BookingDialogPage;
  createEventPage: CreateEventPage;
  dashboardPage: DashboardPage;
  loginPage: LoginPage;
  signupPage: SignupPage;
};

export const test = base.extend<AppFixtures>({
  appCommands: async ({ page, request }, use) => {
    await use(new AppCommand(page, new TestSessionApi(request)));
  },
  appShellPage: async ({ page }, use) => {
    await use(new AppShellPage(page));
  },
  bookingDialogPage: async ({ page }, use) => {
    await use(new BookingDialogPage(page));
  },
  createEventPage: async ({ page }, use) => {
    await use(new CreateEventPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  }
});

export { expect };
