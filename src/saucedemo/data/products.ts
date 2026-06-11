/**
 * SauceDemo product catalogue — the six fixed inventory items.
 *
 * Centralising this data keeps tests DRY: if a product name changes,
 * we update it here once instead of in every spec.
 */

export interface Product {
  name: string;
  price: number;
}

export const PRODUCTS = {
  backpack: { name: 'Sauce Labs Backpack', price: 29.99 },
  bikeLight: { name: 'Sauce Labs Bike Light', price: 9.99 },
  boltShirt: { name: 'Sauce Labs Bolt T-Shirt', price: 15.99 },
  fleeceJacket: { name: 'Sauce Labs Fleece Jacket', price: 49.99 },
  onesie: { name: 'Sauce Labs Onesie', price: 7.99 },
  redShirt: { name: 'Test.allTheThings() T-Shirt (Red)', price: 15.99 },
} satisfies Record<string, Product>;

/** All products as a flat array — handy for iterating in data-driven tests. */
export const ALL_PRODUCTS: Product[] = Object.values(PRODUCTS);

/** Total number of products expected on the inventory page. */
export const PRODUCT_COUNT = ALL_PRODUCTS.length;

/** SauceDemo applies a fixed 8% sales tax at checkout. */
export const TAX_RATE = 0.08;

/**
 * Customer details used in checkout tests.
 * NOTE: prefer TestDataFactory.buildCheckoutInfo() for randomised data —
 * this static object is kept for cases that need a fixed, known value.
 */
export const CHECKOUT_CUSTOMER = {
  firstName: 'Shubham',
  lastName: 'Singh',
  postalCode: '560001',
};
