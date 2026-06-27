import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { checkoutService } from "../services/checkout.js";
import { orderService } from "../services/order.js";

export const preview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await checkoutService.preview({
    buyerId: req.user.id,
    ...req.body,
  });
  return sendSuccess(res, result);
});

export const confirm = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const order = await checkoutService.confirm({
    buyerId: req.user.id,
    ...req.body,
  });
  return sendSuccess(res, order, 201);
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };
  const result = await orderService.listForBuyer(
    req.user.id,
    page,
    limit,
    status,
  );
  return sendSuccess(res, result);
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { id } = req.params as { id: string };
  const result = await orderService.getForBuyer(req.user.id, id);
  return sendSuccess(res, result);
});

export const getSpendingReport = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { from, to } = req.query as { from?: string; to?: string };
    const result = await orderService.spendingReport(
      req.user.id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return sendSuccess(res, result);
  },
);
