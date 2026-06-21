import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { addressService } from "../services/address.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await addressService.list(req.user.id);
  return sendSuccess(res, result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await addressService.create(req.user.id, req.body);
  return sendSuccess(res, result, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await addressService.update(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendSuccess(res, result);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await addressService.remove(req.user.id, req.params.id);
  return sendSuccess(res, result);
});
