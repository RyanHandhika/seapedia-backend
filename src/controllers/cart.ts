import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { cartService } from "../services/cart.js";

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await cartService.getCart(req.user.id);
  return sendSuccess(res, result);
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { productId, quantity } = req.body;
  const result = await cartService.addItem(req.user.id, productId, quantity);
  return sendSuccess(res, result, 201);
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { id } = req.params as { id: string };
  const result = await cartService.updateItem(
    req.user.id,
    id,
    req.body.quantity,
  );
  return sendSuccess(res, result);
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { id } = req.params as { id: string };
  const result = await cartService.removeItem(req.user.id, id);
  return sendSuccess(res, result);
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await cartService.clearCart(req.user.id);
  return sendSuccess(res, result);
});
