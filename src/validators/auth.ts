import { z } from "zod";
import { Role } from "../generated/prisma/client.js";

// Roles a logged-in user can actively switch between (not ADMIN — Admin
// accounts are provisioned via seed data only and never selected mid-session).
export const switchableRoles = [Role.SELLER, Role.BUYER, Role.DRIVER] as const;

// Registration no longer accepts a roles[] field.
// Every new account starts as BUYER — exactly how Shopee/Tokopedia work.
// SELLER is granted later via "Open Store"; DRIVER via "Join as Driver".
export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email().max(150),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(3),
  password: z.string().min(1),
});

export const selectRoleSchema = z.object({
  role: z.enum(switchableRoles),
});

export const switchRoleSchema = z.object({
  role: z.enum(switchableRoles),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
