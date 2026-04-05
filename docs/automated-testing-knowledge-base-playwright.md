# Automated Testing Knowledge Base for Playwright

A practical reference for writing high-quality automated tests with Playwright. This document preserves strong testing principles and engineering discipline, translated into Playwright terminology and workflows for this repository.

Use this as project guidance when creating or reviewing:
- End-to-end tests
- API and integration tests
- Test data builders and fixtures
- Reusable commands, helpers, and fixtures
- CI-friendly automation patterns

---

## Table of Contents

1. [General Testing Principles](#1-general-testing-principles)
2. [E2E Testing with Playwright](#2-e2e-testing-with-playwright)
3. [Unit and Component Testing](#3-unit-and-component-testing)
4. [React and React Native Component Testing](#4-react-and-react-native-component-testing)
5. [API and Integration Testing](#5-api-and-integration-testing)
6. [Test Data Management](#6-test-data-management)
7. [Commands, Fixtures, and Utilities](#7-commands-fixtures-and-utilities)
8. [CI, Parallelization, and Reporting](#8-ci-parallelization-and-reporting)
9. [Anti-Patterns to Avoid](#9-anti-patterns-to-avoid)
10. [Quick Reference Card](#10-quick-reference-card)

---

## 1. General Testing Principles

### Test Independence

- Every test must be runnable in isolation and in any order.
- Each test should create or seed its own data in `beforeEach`, fixture setup, or helper commands.
- Never depend on data created by another test.
- Avoid shared mutable state across tests, workers, or suites.
- Reset authentication, storage, and feature flags between tests when needed.

### Arrange, Act, Assert

Keep each test readable and intentional:

```ts
test("Users can publish an event", async ({ page }) => {
  // Arrange
  const eventName = "Sunset Sessions";

  // Act
  await page.getByTestId("event-name-input").fill(eventName);
  await page.getByTestId("submit-button").click();

  // Assert
  await expect(page.getByTestId("success-toast")).toBeVisible();
});
```

### Test Naming

- Name tests from the user or business perspective.
- Describe the scenario and the outcome, not the implementation.
- Include ticket IDs when available.
- Favor names that would still make sense to a product manager or client in a test report.

Examples:
- `Users can filter events by city`
- `New users can create an account from the sign-up experience`
- `Registered users can publish an event and find it from search`

### Behavior Over Implementation

- Verify visible behavior, API outcomes, and business rules.
- Do not assert on private methods, internal state, or framework internals.
- Refactors that preserve behavior should not require widespread test rewrites.

---

## 2. E2E Testing with Playwright

### Recommended Project Structure

```text
tests/
├── e2e/
│   ├── api/                   # API-only tests
│   │   └── smoke/
│   ├── auth/                  # Feature-based E2E suites
│   ├── dashboard/
│   ├── events/
│   └── smoke/
├── data/                      # Factories and dynamic data builders
├── fixtures/                  # Playwright fixtures
├── pages/                     # Page objects and app shell abstractions
├── support/
│   ├── api/                   # API clients for setup/seeding
│   ├── commands/              # Reusable orchestration helpers
│   ├── types/                 # Shared test-only types
│   └── utils/                 # Pure helper functions
└── utils/
```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Test files | `kebab-case.spec.ts` or `feature.spec.ts` | `authentication.spec.ts` |
| Data builders | `camelCase` | `createSignupUser` |
| Helper classes | `PascalCase` | `TestDataApi`, `AppCommands` |
| Test IDs | `kebab-case` | `publish-event-button` |
| Page objects | `feature.page.ts` | `login.page.ts` |

### Selector Priority

Use selectors in this order:

1. `page.getByTestId(...)` with a configured test id attribute
2. Semantic selectors like `getByRole`, `getByLabel`, `getByPlaceholder`
3. Narrow CSS selectors only when the DOM truly lacks better semantics
4. Text selectors only for stable, static content

Preferred test id attribute:

```ts
// playwright.config.ts
use: {
  testIdAttribute: "data-test"
}
```

Rules:
- Prefer explicit, stable test hooks on interactive elements.
- Avoid CSS classes, XPath, fragile parent traversal, and positional selectors without context.
- If a stable selector does not exist, add one to the DOM instead of inventing brittle locators.

### Waiting Strategies

Playwright already auto-waits for many actions, but you should still wait intentionally for business-relevant signals.

```ts
test("publishes an event", async ({ page }) => {
  const publishRequest = page.waitForResponse((response) => {
    return response.url().includes("/api/events") && response.request().method() === "POST";
  });

  await page.getByTestId("submit-button").click();

  const response = await publishRequest;
  expect(response.status()).toBe(201);
  await expect(page.getByTestId("success-toast")).toBeVisible();
});
```

Good patterns:
- Wait for a specific response with `page.waitForResponse`
- Wait for page state with `expect(locator).toBeVisible()`
- Wait for URL changes with `expect(page).toHaveURL(...)`
- Wait for loading states to disappear when the app exposes them

Never do this:

```ts
await page.waitForTimeout(5000);
```

### Tagging and Suite Organization

Every test should be easy to filter in CI and reporting.

Use one of these patterns consistently:

- Add tags in the test title:

```ts
test("@regression @events users can filter events by city", async () => {
  // ...
});
```

- Or, if your Playwright version and reporter support metadata tags cleanly, standardize on that project-wide.

Tagging rules:
- E2E tests: ticket tag + suite tag + feature tag
- API tests: test type tag + feature tag
- Avoid role-only tags as the main categorization strategy

### Authentication and Session Management

Preferred order:

1. API-based authentication or seeded session state
2. Reusable auth fixtures or commands
3. UI login only when the login flow itself is under test

Examples:
- Use `storageState` when the app supports it cleanly
- Use API helpers to create authenticated state for non-auth scenarios
- Log out through the UI or state reset only when the scenario requires validating logout behavior

### State Setup Pattern

Use setup helpers before navigation:

```ts
test.beforeEach(async ({ appCommands }) => {
  await appCommands.resetState();
});

test("registered users can access the dashboard", async ({
  appCommands,
  loginPage,
  dashboardPage
}) => {
  const user = await appCommands.createUser();
  await appCommands.seedRegisteredUser(user);

  await loginPage.goto();
  await loginPage.signIn(user.email, user.password);

  await dashboardPage.expectVisible();
});
```

Rules:
- Prefer API or backend setup to UI setup.
- Do not navigate through multiple screens just to manufacture state.
- Keep setup fast, deterministic, and reusable.

### Performance: Group Related UI Flows Strategically

There is a balance here.

Good:
- Keep a cohesive user journey in one test when it represents one business scenario.
- Avoid repeated navigation when create, edit, and delete are all part of one end-to-end story.

Bad:
- Splitting every single click into separate tests that all repeat the same heavy setup and navigation.

Use business boundaries, not arbitrary CRUD boundaries.

### File Upload Testing

```ts
await page.getByTestId("attachments-input").setInputFiles([
  "tests/fixtures/files/test-image.jpg",
  "tests/fixtures/files/test-pdf.pdf"
]);
```

### Calendar and Date Picker Handling

When testing date pickers:
- Scope to the correct panel or month
- Avoid relying on duplicated day numbers across adjacent months
- Prefer test ids when possible
- If no stable hooks exist, anchor from the visible month label before selecting a day

### Feature Flag Management

- Toggle flags through API, configuration, or backend helpers, not through admin UI.
- Clear all overrides in shared setup when possible.
- Never let one test leak a feature-flag override into another.

### Database Interactions

Use direct DB access only when:
- No API or supported setup helper exists
- You must verify persistence details unavailable elsewhere
- Data integrity checks require database-level assertions

Database access should be strategic, not the default.

---

## 3. Unit and Component Testing

The core rules remain the same whether you use Jest or Vitest.

### Mocking

- Prefer type-safe mocks
- Avoid unsafe casting
- Keep mocks focused on external boundaries, not internal implementation

```ts
import { myService } from "./myService";
vi.mock("./myService");

const mockedService = vi.mocked(myService);
```

### Date Handling

```ts
const BASE_DATE = new Date("2025-01-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});
```

### Dependency Injection

- Build a fresh test container per test
- Bind mocks explicitly
- Tear down or restore after each test
- Do not let IOC container state leak across suites

### Fixtures

Keep fixtures close to the test domain and prefer factory functions with overrides:

```ts
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "test-user-id",
  name: "Test User",
  email: "test@example.com",
  ...overrides
});
```

### Suite Organization

Organize by public behavior:

```ts
describe("UserService", () => {
  describe("createUser", () => {
    it("creates a user with valid data", () => {});
    it("throws when email is duplicate", () => {});
  });

  describe("deleteUser", () => {
    it("soft-deletes the user", () => {});
    it("throws when user is not found", () => {});
  });
});
```

---

## 4. React and React Native Component Testing

### React Testing Library Query Priority

1. `getByRole`
2. `getByLabelText`
3. `getByPlaceholderText`
4. `getByText`
5. `getByTestId`

```ts
expect(screen.getByRole("button", { name: /submit/i })).toBeVisible();
```

Use `getByTestId` only when accessible or semantic selectors are not practical.

### GraphQL Testing

- Prefer provider-based mocks such as `MockedProvider`
- Avoid mocking GraphQL hooks wholesale when component behavior can be tested through the provider boundary

### Custom Hooks

- Test hooks via `renderHook` with real providers where needed
- Do not mock `useContext` when a wrapper can provide the real dependency

### React Native

- Use `testID` on native controls
- Prefer `fireEvent` over direct prop invocation
- Avoid unsafe traversal methods and parent navigation hacks

---

## 5. API and Integration Testing

### Complete Coverage Pattern

Every API test suite should cover:

1. Positive scenarios
2. Negative scenarios
3. Authentication and authorization scenarios
4. Edge cases

```ts
test.describe("Resource API", () => {
  test.describe("Positive scenarios", () => {
    test("creates a resource successfully", async ({ request }) => {
      const response = await request.post("/api/resources", {
        data: validPayload
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe(validPayload.name);
    });
  });

  test.describe("Negative scenarios", () => {
    test("returns 422 when required fields are missing", async ({ request }) => {
      const response = await request.post("/api/resources", {
        data: {}
      });

      expect(response.status()).toBe(422);
    });
  });
});
```

### Response Validation Checklist

Always validate:

1. Status code
2. Response structure
3. Data accuracy
4. Business logic and side effects

---

## 6. Test Data Management

### Dynamic Data

Use factory functions for most test data, with overrides for readability and control:

```ts
export function createSignupUser(overrides: Partial<SignupUser> = {}): SignupUser {
  return {
    name: "Test User",
    email: `qa-${Date.now()}@example.com`,
    password: "Password123",
    ...overrides
  };
}
```

### Fixture Patterns

- Static fixtures: schema validation, fixed payloads, sample responses
- Dynamic fixtures: factories plus faker for unique test data
- File fixtures: upload scenarios
- Seed data: local and CI environment initialization only

### Environment Configuration

Keep environment-specific values in config or environment variables, never hardcoded in tests.

Examples:
- `PLAYWRIGHT_BASE_URL`
- API base URLs
- Test credentials from CI secrets
- Feature toggle endpoints or service tokens

---

## 7. Commands, Fixtures, and Utilities

### Command Organization

In Playwright, the Cypress idea of "custom commands" maps cleanly to:
- fixture extensions
- helper classes
- API clients
- pure utility functions

Example structure:

```text
tests/support/
├── api/
│   └── test-data.api.ts
├── commands/
│   └── app.command.ts
├── types/
│   └── app-state.ts
└── utils/
    └── date.ts
```

### Common Categories

| Category | Examples |
|----------|---------|
| Auth | `login`, `seedAuthenticatedUser`, `buildStorageState` |
| Entity creation | `createUser`, `createEvent`, `createBooking` |
| Entity setup | `seedDashboardState`, `seedEventsForUser` |
| Feature flags | `turnOnFeatureFlag`, `clearFeatureOverrides` |
| Utilities | OTP helpers, date formatting, file builders |
| External services | email preview helpers, stubs, contract setup |

### Fixture Extension Pattern

```ts
import { test as base } from "@playwright/test";
import { AppCommands } from "../support/commands/app.command";

export const test = base.extend<{
  appCommands: AppCommands;
}>({
  appCommands: async ({ page, request }, use) => {
    await use(new AppCommands(page, request));
  }
});
```

### Rules for Helpers

- Commands should orchestrate actions, not hide assertions indiscriminately.
- Utilities should stay pure when possible.
- Page objects should model UI surfaces, not contain business logic unrelated to the page.
- API clients should focus on HTTP interaction, not browser manipulation.

---

## 8. CI, Parallelization, and Reporting

### Parallelization

- Use Playwright workers to parallelize safely.
- Only enable parallel execution when tests are truly isolated.
- Consider sharding in CI for large suites.

Examples:

```bash
npx playwright test --project=chromium
npx playwright test --grep @smoke
npx playwright test --shard=1/4
```

### CI Principles

- Cache dependencies and browser binaries
- Store traces, screenshots, and videos on failure
- Keep retries low and intentional
- Prefer deterministic test setup over retry-heavy pipelines
- Publish HTML or JUnit reports for CI visibility

### Reporting

Make reports useful to non-engineers:
- Clear suite and test naming
- Ticket IDs where available
- Feature-level grouping
- Failure artifacts attached automatically

---

## 9. Anti-Patterns to Avoid

### Selectors

- CSS classes such as `.btn-primary`
- XPath
- Positional selectors without context
- Dynamic text selectors for unstable content

### Waits

- Arbitrary waits such as `waitForTimeout(5000)`
- Assuming the app is ready without asserting on a real signal

### Data

- Hardcoded credentials, IDs, or secrets
- Assuming pre-existing environment data
- Sharing state across tests

### Structure

- Tests that require a specific order
- UI-driven setup for all scenarios
- Mixing too many unrelated concerns into one test
- Over-testing implementation details

### DOM and Browser State

- Direct DOM manipulation from tests unless there is no supported alternative
- Global state pollution through `window` hacks
- Hidden setup logic that makes tests hard to understand

### Mocking

- Over-mocking component internals
- Shared mock state between tests
- Unsafe casts instead of typed mocks
- Testing mocked implementation details instead of user-visible behavior

---

## 10. Quick Reference Card

```text
Selector priority:  getByTestId > getByRole/getByLabel > scoped CSS > text
Test data:          Factory functions + faker
State setup:        API or backend helpers in beforeEach/fixtures
Waiting:            waitForResponse + locator assertions + URL assertions
Auth:               Seeded session or API login; UI login only when under test
Assertions:         Status + structure + accuracy + business logic
Performance:        Keep related business flows together; avoid redundant navigation
DB access:          Only when API/setup helpers are insufficient
Feature flags:      Toggle outside the UI and clean up globally
File naming:        feature.spec.ts
Test ID naming:     kebab-case
Helper naming:      camelCase for functions, PascalCase for classes
```

---

## Project Notes

For this repository in particular:

- Prefer `data-test` attributes and `page.getByTestId(...)`
- Add missing test hooks to the DOM instead of relying on brittle selectors
- Seed data through backend or setup helpers whenever possible
- Keep auth tests focused on auth behavior, not generic setup
- Treat this document as the default testing standard for future Playwright coverage
