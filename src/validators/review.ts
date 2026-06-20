import { z } from "zod";

export const submitReviewSchema = z.object({
  reviewerName: z.string().min(2).max(100),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1).max(1000),
});

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});
