import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { storeService } from "../services/store.js";

export const getMyStore = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const store = await storeService.getMyStore(req.user.id);
  return sendSuccess(res, store);
});

export const updateMyStore = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const store = await storeService.updateMyStore(req.user.id, req.body);
    return sendSuccess(res, store);
  },
);
