import { z } from 'zod';

/**
 * Response contracts for the DummyJSON auth endpoints, expressed as zod schemas.
 *
 * The schema doubles as the TypeScript type via `z.infer`, so the runtime
 * contract and the static type stay in sync. Parsing a response validates the
 * shape the live API actually returns and reports the exact failing path on a
 * mismatch.
 *
 * zod objects ignore unknown keys by default, so `/auth/me` (which returns many
 * more profile fields) still validates against the core user schema below. We
 * assert on the fields the tests depend on, not every field.
 */

/** Core user profile fields returned by login and /auth/me. */
export const authUserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.string().min(1),
  image: z.string().url(),
});

/** Login adds the JWT access + refresh tokens to the user profile. */
export const loginResponseSchema = authUserSchema.extend({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

/** /auth/refresh returns just the new token pair. */
export const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
