import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { verifyRolePendingToken } from "../utils/jwt.js";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

// Distinct from authenticate(): this only accepts the short-lived
// role-pending token issued by /auth/login for multi-role users, and is
// only ever used on POST /auth/select-role.
export function authenticateRolePending(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = extractBearerToken(req);
  if (!token)
    return next(AppError.unauthorized("Missing role-selection token"));

  try {
    const payload = verifyRolePendingToken(token);
    req.rolePendingUser = { id: payload.sub, roles: payload.roles };
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired role-selection token"));
  }
}
