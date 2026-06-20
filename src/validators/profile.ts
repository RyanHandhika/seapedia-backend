import { z } from "zod";

// "Become a Seller" — user gives their store a name right at upgrade time
// so the store stub is immediately created in the same transaction.
// This is the Shopee "Open Store" / Tokopedia "Buka Toko" pattern.
export const becomeSellerSchema = z.object({
  storeName: z.string().min(3).max(60),
  description: z.string().max(500).optional(),
});

// "Join as Driver" has no extra fields for now — just a role grant.
// A future level may add vehicle type, licence plate, etc.
export const becomeDriverSchema = z.object({});

export type BecomeSellerInput = z.infer<typeof becomeSellerSchema>;
