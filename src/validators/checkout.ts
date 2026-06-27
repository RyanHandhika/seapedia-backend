import { z } from "zod";
import { DeliveryMethod } from "../generated/prisma/client.js";

export const checkoutSchema = z.object({
  addressId: z.string().uuid("Invalid address id"),
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  discountCode: z.string().min(1).max(50).optional(),
});
