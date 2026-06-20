import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";

// Final middleware in the chain. Converts thrown AppError instances into a
// consistent JSON shape; anything else is treated as an unexpected 500 and
// logged server-side without leaking internals to the client.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      errors: err.details,
    });
  }

  console.error("Unexpected error:", err);
  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "Something went wrong",
  });
}
