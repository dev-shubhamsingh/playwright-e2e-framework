import { z } from 'zod';
import { deletedFlagsSchema, paginationEnvelopeSchema } from './common.schema';

/**
 * Response contracts for the DummyJSON `/carts` endpoints.
 *
 * Contract nuance: a line item on a fetched cart (`GET /carts/:id`) carries a
 * `discountedTotal`, while a line item on a freshly added cart
 * (`POST /carts/add`) carries `discountedPrice` instead. Both are therefore
 * optional here so the one schema validates both responses.
 */
export const cartProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  total: z.number().nonnegative(),
  discountPercentage: z.number().nonnegative(),
  discountedTotal: z.number().nonnegative().optional(),
  discountedPrice: z.number().nonnegative().optional(),
  thumbnail: z.string().url(),
});

/** A single cart with its line items and computed totals. */
export const cartSchema = z.object({
  id: z.number().int().positive(),
  products: z.array(cartProductSchema),
  total: z.number().nonnegative(),
  discountedTotal: z.number().nonnegative(),
  userId: z.number().int().positive(),
  totalProducts: z.number().int().nonnegative(),
  totalQuantity: z.number().int().nonnegative(),
});

/** Cart list/by-user response: pagination envelope + carts. */
export const cartListSchema = paginationEnvelopeSchema.extend({
  carts: z.array(cartSchema),
});

/** A deleted cart echoes the cart back with the simulated-delete flags. */
export const deletedCartSchema = cartSchema.extend(deletedFlagsSchema.shape);

export type CartProduct = z.infer<typeof cartProductSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartList = z.infer<typeof cartListSchema>;
