import { z } from 'zod';
import { deletedFlagsSchema, paginationEnvelopeSchema } from './common.schema';

/**
 * Response contracts for the DummyJSON `/users` endpoints.
 *
 * `userSchema` validates the fields tests rely on for *real* users (read,
 * search, update, delete); zod ignores the many extra fields DummyJSON returns
 * (address, company, bank, ...). It is deliberately NOT used for `POST
 * /users/add`, whose echo leaves most fields as empty strings — see
 * `createdUserSchema`.
 */
export const userSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().int().positive(),
  gender: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  image: z.string().url(),
});

/** User list/search response: pagination envelope + users. */
export const userListSchema = paginationEnvelopeSchema.extend({
  users: z.array(userSchema),
});

/**
 * `POST /users/add` is simulated: it echoes the submitted fields and assigns a
 * new id, but leaves unsupplied fields as empty strings/nulls. So we validate
 * only the new id and the fields we actually sent rather than a full user.
 */
export const createdUserSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  age: z.number(),
});

/** A deleted user echoes the user back with the simulated-delete flags. */
export const deletedUserSchema = userSchema.extend(deletedFlagsSchema.shape);

export type User = z.infer<typeof userSchema>;
export type UserList = z.infer<typeof userListSchema>;
export type CreatedUser = z.infer<typeof createdUserSchema>;
