import { test as base, expect } from "@playwright/test";
import { DashboardPage } from "../pages/dashboard.page";
import { LoginPage } from "../pages/login.page";
import { SignupPage } from "../pages/signup.page";

type AppFixtures = {
  dashboardPage: DashboardPage;
  loginPage: LoginPage;
  signupPage: SignupPage;
};

export const test = base.extend<AppFixtures>({
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
