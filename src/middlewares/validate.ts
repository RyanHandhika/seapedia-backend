import type { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "../utils/appError.js";

type RequestPart = "body" | "query" | "params";

// Validates req[part] against a Zod schema and exposes the parsed/coerced
// result back on req[part] so controllers receive typed, sanitized input.
//
// IMPORTANT (Express 5): `req.query` (and, in some setups, `req.params`) is
// backed by a prototype getter with no setter. A plain assignment
// (`req.query = parsed`) throws "Cannot set property query ... which has only a
// getter", which previously broke EVERY list endpoint that validates "query"
// (catalog, orders, admin lists, driver jobs, wallet tx, …).
//
// The fix: redefine the property as a writable own-property on this request
// instance via Object.defineProperty, then assign the parsed value. This
// shadows the prototype getter for this one request and persists reliably
// across later `req.query` reads in the controller. `req.body` is writable, so
// it can be assigned directly.
export function validate(schema: ZodType, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(
        AppError.badRequest(
          "Validation failed",
          result.error.flatten().fieldErrors,
        ),
      );
    }

    if (part === "body") {
      req.body = result.data;
    } else {
      Object.defineProperty(req, part, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    next();
  };
}
