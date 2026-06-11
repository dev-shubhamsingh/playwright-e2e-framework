import { APIResponse } from '@playwright/test';
import { ApiClient } from '@core/http';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginOptions {
  /** Access-token lifetime in minutes. DummyJSON defaults to 60. */
  expiresInMins?: number;
}

/**
 * AuthClient — wraps the DummyJSON `/auth/*` endpoints.
 *
 * Endpoints covered:
 *   POST /auth/login    → returns user profile + accessToken + refreshToken
 *   GET  /auth/me       → returns the current user for a given access token
 *   POST /auth/refresh  → issues a new access/refresh token pair
 *
 * Methods return the raw APIResponse so callers assert on status + body.
 */
export class AuthClient extends ApiClient {
  /**
   * Authenticate a user. On success returns 200 with tokens in the body
   * (and as cookies). On invalid credentials DummyJSON returns 400.
   */
  async login(
    credentials: LoginCredentials,
    options: LoginOptions = {},
  ): Promise<APIResponse> {
    return this.post('/auth/login', {
      data: { ...credentials, ...options },
    });
  }

  /**
   * Fetch the currently authenticated user.
   *
   * Pass an explicit token to validate token handling directly. If omitted,
   * the call relies on whatever auth the underlying request context carries
   * (e.g. a bearer header pre-attached by the `authedRequest` fixture).
   */
  async me(accessToken?: string): Promise<APIResponse> {
    return this.get('/auth/me', {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    });
  }

  /**
   * Exchange a refresh token for a fresh access/refresh token pair without
   * re-sending credentials.
   */
  async refresh(
    refreshToken: string,
    options: LoginOptions = {},
  ): Promise<APIResponse> {
    return this.post('/auth/refresh', {
      data: { refreshToken, ...options },
    });
  }
}
