import { test, expect } from '@dummyjson/fixtures';
import { TestDataFactory } from '@shared/utils';
import {
  createdUserSchema,
  deletedUserSchema,
  errorResponseSchema,
  userListSchema,
  userSchema,
} from '@dummyjson/schemas';

/**
 * Users endpoint integration tests against DummyJSON.
 *
 * Covers the list envelope, pagination, field selection, search, single-user
 * retrieval, the 404 negative case, and the simulated create/update/delete
 * write flows. Write payloads use freshly faked data so runs never collide on
 * static values; DummyJSON does not persist writes, so tests assert on the
 * returned contract rather than re-fetching.
 */
test.describe('Users API', () => {
  test('lists users with a valid pagination envelope', async ({
    usersClient,
  }) => {
    const response = await usersClient.list();

    expect(response.status()).toBe(200);

    const body = userListSchema.parse(await response.json());
    expect(body.users.length).toBeGreaterThan(0);
    expect(body.users.length).toBeLessThanOrEqual(body.limit);
    expect(body.total).toBeGreaterThan(body.users.length);
  });

  test('paginates with limit and skip', async ({ usersClient }) => {
    const limit = 5;
    const skip = 10;

    const response = await usersClient.list({ limit, skip });

    expect(response.status()).toBe(200);

    const body = userListSchema.parse(await response.json());
    expect(body.limit).toBe(limit);
    expect(body.skip).toBe(skip);
    expect(body.users).toHaveLength(limit);
  });

  test('returns only selected fields when using select', async ({
    usersClient,
  }) => {
    const response = await usersClient.list({ limit: 3, select: 'firstName' });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.users).toHaveLength(3);
    for (const user of body.users) {
      // Selected responses carry only id + the requested fields.
      expect(Object.keys(user).sort()).toEqual(['firstName', 'id']);
    }
  });

  test('searches users by query', async ({ usersClient }) => {
    const response = await usersClient.search('Emily');

    expect(response.status()).toBe(200);

    const body = userListSchema.parse(await response.json());
    expect(body.total).toBeGreaterThan(0);
    for (const user of body.users) {
      const haystack =
        `${user.firstName} ${user.lastName} ${user.username}`.toLowerCase();
      expect(haystack).toContain('emily');
    }
  });

  test('returns a single user by id', async ({ usersClient }) => {
    const response = await usersClient.getById(1);

    expect(response.status()).toBe(200);

    const user = userSchema.parse(await response.json());
    expect(user.id).toBe(1);
  });

  test('returns 404 for a non-existent user', async ({ usersClient }) => {
    const response = await usersClient.getById(0);

    expect(response.status()).toBe(404);

    const body = errorResponseSchema.parse(await response.json());
    expect(body.message).toMatch(/not found/i);
  });

  test('creates a user and echoes the submitted fields', async ({
    usersClient,
  }) => {
    const newUser = {
      firstName: TestDataFactory.firstName(),
      lastName: TestDataFactory.lastName(),
      age: 30,
    };

    const response = await usersClient.add(newUser);

    expect(response.status()).toBe(201);

    const created = createdUserSchema.parse(await response.json());
    expect(created.firstName).toBe(newUser.firstName);
    expect(created.lastName).toBe(newUser.lastName);
    expect(created.id).toBeGreaterThan(0);
  });

  test('updates a user and reflects the change', async ({ usersClient }) => {
    const lastName = TestDataFactory.lastName();

    const response = await usersClient.update(1, { lastName });

    expect(response.status()).toBe(200);

    const user = userSchema.parse(await response.json());
    expect(user.id).toBe(1);
    expect(user.lastName).toBe(lastName);
  });

  test('deletes a user and flags it as deleted', async ({ usersClient }) => {
    const response = await usersClient.remove(1);

    expect(response.status()).toBe(200);

    const user = deletedUserSchema.parse(await response.json());
    expect(user.id).toBe(1);
    expect(user.isDeleted).toBe(true);
  });
});
