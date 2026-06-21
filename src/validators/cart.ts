import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().uuid("Invalid product id"),
  quantity: z.coerce.number().int().min(1).max(999),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(999),
});

export const cartProductIdParamSchema = z.object({
  productId: z.string().uuid("Invalid product id"),
});
