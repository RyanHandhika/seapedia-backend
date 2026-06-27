import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const msg = (code: string) => ({
  success: false,
  code,
  message: "Too many requests, please slow down.",
});

const userOrIpKey = (req: Request): string => {
  return req.user?.id ?? ipKeyGenerator(req.ip ?? "");
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg("RATE_LIMITED"),
});

export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg("RATE_LIMITED"),
});

export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg("RATE_LIMITED"),
  keyGenerator: userOrIpKey,
});

export const topupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg("RATE_LIMITED"),
  keyGenerator: userOrIpKey,
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg("RATE_LIMITED"),
  keyGenerator: userOrIpKey,
});
