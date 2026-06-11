import { faker } from '@faker-js/faker';

/**
 * Test Data Factory — generates realistic, randomised test data using Faker.
 *
 * WHY a factory pattern (Senior QA perspective):
 *   - Each test run uses fresh, unique data → catches hard-coded assumptions
 *   - No test pollution from shared/static values
 *   - `overrides` let a test pin specific fields while randomising the rest
 *   - Centralised: if the shape of checkout data changes, we change it here once
 *
 * Determinism note:
 *   Faker can be seeded (faker.seed(123)) for reproducible runs. We expose
 *   `seed()` so a flaky investigation can lock the data to a known value.
 */

export interface CheckoutInfo {
  firstName: string;
  lastName: string;
  postalCode: string;
}

export class TestDataFactory {
  /**
   * Seed Faker for reproducible data.
   * Call this in a test/beforeEach when you need the SAME data every run.
   */
  static seed(value: number): void {
    faker.seed(value);
  }

  /**
   * Build a checkout-info object with realistic fake data.
   * Pass `overrides` to fix specific fields:
   *   buildCheckoutInfo({ postalCode: '' }) → random name, empty zip
   */
  static buildCheckoutInfo(
    overrides: Partial<CheckoutInfo> = {},
  ): CheckoutInfo {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      postalCode: faker.location.zipCode(),
      ...overrides,
    };
  }

  /** A single realistic first name. */
  static firstName(): string {
    return faker.person.firstName();
  }

  /** A single realistic last name. */
  static lastName(): string {
    return faker.person.lastName();
  }

  /** A realistic postal/zip code. */
  static postalCode(): string {
    return faker.location.zipCode();
  }

  /** A realistic email address. */
  static email(): string {
    return faker.internet.email();
  }
}
