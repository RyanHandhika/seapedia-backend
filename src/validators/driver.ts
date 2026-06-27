import { z } from "zod";

export const jobIdParamSchema = z.object({
  id: z.string().uuid("Invalid job id"),
});

export const driverJobQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
