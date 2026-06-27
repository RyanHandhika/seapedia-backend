import { z } from "zod";

const addressBody = z.object({
  label: z.string().min(1).max(50),
  recipientName: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[\d\s\-]{8,20}$/, "Invalid phone number"),
  fullAddress: z.string().min(10).max(500),
  isDefault: z.boolean().optional().default(false),
});

export const createAddressSchema = addressBody;
export const updateAddressSchema = addressBody.partial();

export const addressIdParamSchema = z.object({
  id: z.string().uuid("Invalid address id"),
});
