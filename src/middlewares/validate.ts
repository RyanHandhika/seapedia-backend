import type { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "../utils/appError.js";

type RequestPart = "body" | "query" | "params";

// Validates and (importantly) replaces req[part] with the parsed/typed
// output, so controllers always receive sanitized, coerced input.
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
    // Express types req.query/req.params loosely; this cast is intentional.
    (req as unknown as Record<RequestPart, unknown>)[part] = result.data;
    next();
  };
}
