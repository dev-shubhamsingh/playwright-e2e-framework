import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { DUMMYJSON_USER } from '@dummyjson/config';

const { like, string, integer } = MatchersV3;

/**
 * Auth consumer contract — DummyJSON `/auth/login` and `/auth/me`.
 *
 * These pact specs define what the test suite (consumer "playwright-e2e")
 * expects from the DummyJSON API (provider "DummyJSON"). The Pact library
 * runs a mock server for each interaction, verifies the consumer can handle
 * the response, and writes a `.json` contract to `pacts/`. The provider can
 * then replay that contract against the live API to verify it still holds.
 *
 * WHY Pact alongside zod:
 *   zod validates response shape at runtime inside integration tests.
 *   Pact generates a versioned, shareable contract that the provider team
 *   can verify independently — different safety net, different purpose.
 */

const provider = new PactV3({
  consumer: 'playwright-e2e',
  provider: 'DummyJSON',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'error',
});

describe('Auth contract — POST /auth/login', () => {
  it('returns tokens and user profile for valid credentials', async () => {
    await provider
      .given('valid credentials exist')
      .uponReceiving('a login request with valid credentials')
      .withRequest({
        method: 'POST',
        path: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: {
          username: string(DUMMYJSON_USER.username),
          password: string(DUMMYJSON_USER.password),
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': like('application/json') },
        body: like({
          id: integer(1),
          username: string('emilys'),
          email: string('emily.johnson@x.dummyjson.com'),
          firstName: string('Emily'),
          lastName: string('Johnson'),
          gender: string('female'),
          image: string('https://dummyjson.com/icon/emilys/128'),
          accessToken: string('token'),
          refreshToken: string('token'),
        }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(DUMMYJSON_USER),
        });

        expect(response.status).toBe(200);
        const body = (await response.json()) as {
          accessToken: string;
          username: string;
        };
        expect(body.accessToken).toBeTruthy();
        expect(body.username).toBe(DUMMYJSON_USER.username);
      });
  });

  it('returns 400 for invalid credentials', async () => {
    await provider
      .given('invalid credentials are supplied')
      .uponReceiving('a login request with wrong password')
      .withRequest({
        method: 'POST',
        path: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: {
          username: string('not-a-user'),
          password: string('wrong-password'),
        },
      })
      .willRespondWith({
        status: 400,
        headers: { 'Content-Type': like('application/json') },
        body: like({ message: string('Invalid credentials') }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'not-a-user',
            password: 'wrong-password',
          }),
        });

        expect(response.status).toBe(400);
        const body = (await response.json()) as { message: string };
        expect(body.message).toMatch(/invalid credentials/i);
      });
  });
});

describe('Auth contract — GET /auth/me', () => {
  it('returns user profile for a valid bearer token', async () => {
    await provider
      .given('a valid bearer token exists')
      .uponReceiving('a GET /auth/me request with a valid token')
      .withRequest({
        method: 'GET',
        path: '/auth/me',
        headers: { Authorization: like('Bearer token') },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': like('application/json') },
        body: like({
          id: integer(1),
          username: string('emilys'),
          email: string('emily.johnson@x.dummyjson.com'),
        }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/auth/me`, {
          headers: { Authorization: 'Bearer fake-token-for-contract' },
        });

        expect(response.status).toBe(200);
        const body = (await response.json()) as {
          id: number;
          username: string;
        };
        expect(body.id).toBeGreaterThan(0);
        expect(body.username).toBeTruthy();
      });
  });

  it('returns 401 when no token is supplied', async () => {
    await provider
      .given('no token is supplied')
      .uponReceiving('a GET /auth/me request with no token')
      .withRequest({
        method: 'GET',
        path: '/auth/me',
      })
      .willRespondWith({
        status: 401,
        headers: { 'Content-Type': like('application/json') },
        body: like({ message: string('Access Token is required') }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/auth/me`);

        expect(response.status).toBe(401);
        const body = (await response.json()) as { message: string };
        expect(body.message).toBeTruthy();
      });
  });
});
