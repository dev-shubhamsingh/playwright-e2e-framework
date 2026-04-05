import { test } from "../../fixtures/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ appCommands }) => {
    await appCommands.resetState();
  });

  test("new users can create an account from the sign-up experience", async ({
    appCommands,
    appShellPage,
    loginPage,
    signupPage
  }) => {
    const newUser = await appCommands.createUser({
      name: "Riya Sharma"
    });

    await loginPage.goto();
    await loginPage.openSignup();

    await signupPage.expectVisible();
    await signupPage.signUp(newUser);

    await appShellPage.expectToast("Account created. You can now sign in to Bliss.");
    await loginPage.expectVisible();
  });

  test("registered users can access the dashboard and end their session", async ({
    appCommands,
    appShellPage,
    dashboardPage,
    loginPage
  }) => {
    const registeredUser = await appCommands.createUser({
      name: "Arjun Mehta"
    });
    await appCommands.seedRegisteredUser(registeredUser);

    await loginPage.goto();
    await loginPage.signIn(registeredUser.email, registeredUser.password);

    await appShellPage.expectToast(`Welcome back, ${registeredUser.name}. You are now signed in.`);
    await dashboardPage.expectVisible();
    await dashboardPage.logout();

    await loginPage.expectVisible();
  });
});
