import { z } from 'zod';
import { paginationEnvelopeSchema } from './common.schema';

/**
 * Response contracts for the DummyJSON `/products` endpoints.
 *
 * `productSchema` validates the fields the tests rely on; zod ignores the many
 * extra fields DummyJSON returns (dimensions, reviews, meta, ...). Responses
 * that use `?select=` return only a subset, so use `paginationEnvelopeSchema`
 * (from `common.schema`) for those rather than the full product schema.
 */
export const productSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  rating: z.number(),
  stock: z.number().int().nonnegative(),
  thumbnail: z.string().url(),
  images: z.array(z.string().url()),
});

/** Full product list: envelope + fully-shaped products. */
export const productListSchema = paginationEnvelopeSchema.extend({
  products: z.array(productSchema),
});

export type Product = z.infer<typeof productSchema>;
export type ProductList = z.infer<typeof productListSchema>;
