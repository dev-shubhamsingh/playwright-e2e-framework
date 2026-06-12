import { z } from 'zod';

/**
 * Cross-resource response contracts shared by the DummyJSON endpoints.
 *
 * DummyJSON wraps every list/search response in the same pagination envelope
 * and returns the same error shape on failures, so these live here rather than
 * being duplicated per resource.
 */

/** Shared pagination envelope returned by list and search endpoints. */
export const paginationEnvelopeSchema = z.object({
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
});

/** Standard DummyJSON error envelope, e.g. { message: "Invalid credentials" }. */
export const errorResponseSchema = z.object({
  message: z.string().min(1),
});

/**
 * Fields DummyJSON adds to a resource when it is "deleted". Writes are
 * simulated (no persistence), so a delete echoes the resource back with these
 * flags rather than returning 204. Compose with a resource schema via
 * `someSchema.extend(deletedFlagsSchema.shape)`.
 */
export const deletedFlagsSchema = z.object({
  isDeleted: z.literal(true),
  deletedOn: z.string().min(1),
});

export type PaginationEnvelope = z.infer<typeof paginationEnvelopeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
