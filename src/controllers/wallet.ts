import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { walletService } from "../services/wallet.js";

export const getBalance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await walletService.getBalance(req.user.id);
  return sendSuccess(res, result);
});

export const topup = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await walletService.topup(req.user.id, req.body.amount);
  return sendSuccess(res, result);
});

export const listTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { page, limit } = req.query as unknown as {
      page: number;
      limit: number;
    };
    const result = await walletService.listTransactions(
      req.user.id,
      page,
      limit,
    );
    return sendSuccess(res, result);
  },
);
