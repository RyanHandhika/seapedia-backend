import { z } from "zod";

export const topupSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .max(10_000_000, "Single top-up limit is Rp 10.000.000"),
});

export const walletTxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
