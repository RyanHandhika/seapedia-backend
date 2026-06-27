import { z } from "zod";

const discountValueType = z.enum(["PERCENT", "FIXED"]);

export const createVoucherSchema = z
  .object({
    code: z.string().min(3).max(50).toUpperCase(),
    discountType: discountValueType,
    value: z.coerce
      .number()
      .positive()
      .refine((v) => v <= 100 || true, "PERCENT value max 100"),
    expiryDate: z.coerce.date(),
    usageLimit: z.coerce.number().int().min(1),
  })
  .refine((d) => !(d.discountType === "PERCENT" && d.value > 100), {
    message: "Percent discount cannot exceed 100%",
    path: ["value"],
  });

export const createPromoSchema = z
  .object({
    code: z.string().min(3).max(50).toUpperCase(),
    discountType: discountValueType,
    value: z.coerce.number().positive(),
    expiryDate: z.coerce.date(),
    description: z.string().max(500).optional(),
  })
  .refine((d) => !(d.discountType === "PERCENT" && d.value > 100), {
    message: "Percent discount cannot exceed 100%",
    path: ["value"],
  });

export const discountIdParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export const discountListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const validateDiscountQuerySchema = z.object({
  code: z.string().min(1),
  subtotal: z.coerce.number().positive(),
});
