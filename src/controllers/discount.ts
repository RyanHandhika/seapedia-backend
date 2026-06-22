import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { discountService } from "../services/discount.js";

// ── Admin ─────────────────────────────────────────────────────────────────────

export const createVoucher = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await discountService.createVoucher(req.body);
    return sendSuccess(res, result, 201);
  },
);

export const listVouchers = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as {
      page: number;
      limit: number;
    };
    return sendSuccess(res, await discountService.listVouchers(page, limit));
  },
);

export const getVoucher = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  return sendSuccess(res, await discountService.getVoucher(id));
});

export const createPromo = asyncHandler(async (req: Request, res: Response) => {
  const result = await discountService.createPromo(req.body);
  return sendSuccess(res, result, 201);
});

export const listPromos = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as {
    page: number;
    limit: number;
  };
  return sendSuccess(res, await discountService.listPromos(page, limit));
});

export const getPromo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  return sendSuccess(res, await discountService.getPromo(id));
});

// ── Buyer ─────────────────────────────────────────────────────────────────────

export const validateDiscount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { code, subtotal } = req.query as unknown as {
      code: string;
      subtotal: number;
    };
    return sendSuccess(res, await discountService.validateCode(code, subtotal));
  },
);
