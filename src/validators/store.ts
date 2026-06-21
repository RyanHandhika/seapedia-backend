import { z } from "zod";

// Store is created via POST /profile/become-seller (Level 1).
// This schema covers the update-only endpoint PUT /seller/store.
export const updateStoreSchema = z.object({
  storeName: z.string().min(3).max(60).optional(),
  description: z.string().max(500).optional(),
});

export const storeIdParamSchema = z.object({
  id: z.string().uuid("Invalid store id"),
});
