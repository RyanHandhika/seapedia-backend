import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/appError.js";
import { verifyAccessToken } from "../utils/jwt.js";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  // Guard against accidental "Bearer Bearer <token>" which happens when
  // pasting "Bearer <token>" into Swagger UI's Authorize dialog
  // (Swagger already prepends "Bearer " automatically).
  const cleaned = header.startsWith("Bearer Bearer ")
    ? header.slice("Bearer ".length).trim()
    : header;

  if (!cleaned.startsWith("Bearer ")) return null;
  return cleaned.slice("Bearer ".length).trim();
}

interface AuthenticateOptions {
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
    } catch (err) {
      if (options.optional) return next();

      // Return specific reasons so debugging is easier.
      if (err instanceof jwt.TokenExpiredError) {
        return next(
          AppError.unauthorized(
            "Access token expired — please refresh or re-login",
          ),
        );
      }
      if (err instanceof jwt.JsonWebTokenError) {
        return next(
          AppError.unauthorized(`Invalid access token: ${err.message}`),
        );
      }
      return next(AppError.unauthorized("Access token verification failed"));
    }
  };
}
