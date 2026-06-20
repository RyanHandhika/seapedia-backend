import type { NextFunction, Request, Response } from "express";
import { Role } from "../generated/prisma/client.js";
import { AppError } from "../utils/appError.js";

// Authorization is based on the ACTIVE role embedded in the access token,
// never on the full list of roles the user owns — this is the load-bearing
// rule from the SEAPEDIA brief.
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowed.includes(req.user.activeRole)) {
      return next(
        AppError.forbidden(
          `This action requires one of: ${allowed.join(", ")}`,
        ),
      );
    }
    next();
  };
}
