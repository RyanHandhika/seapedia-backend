import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { orderService } from "../services/order.js";

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };
  const result = await orderService.listForSeller(
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
  const result = await orderService.getForSeller(req.user.id, id);
  return sendSuccess(res, result);
});

export const processOrder = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { id } = req.params as { id: string };
    const result = await orderService.processOrder(req.user.id, id);
    return sendSuccess(res, result);
  },
);

export const getIncomeReport = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { from, to } = req.query as { from?: string; to?: string };
    const result = await orderService.incomeReport(
      req.user.id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return sendSuccess(res, result);
  },
);
