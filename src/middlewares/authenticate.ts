import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { verifyAccessToken } from "../utils/jwt.js";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

interface AuthenticateOptions {
  // When true, requests without a (valid) token are allowed through with
  // req.user left undefined, instead of being rejected with 401.
  // Used for endpoints guests may also use, like submitting a review.
  optional?: boolean;
}

export function authenticate(options: AuthenticateOptions = {}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);

    if (!token) {
      if (options.optional) return next();
      return next(AppError.unauthorized("Missing access token"));
    }

    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        roles: payload.roles,
        activeRole: payload.activeRole,
        sid: payload.sid,
      };
      return next();
    } catch {
      if (options.optional) return next();
      return next(AppError.unauthorized("Invalid or expired access token"));
    }
  };
}
