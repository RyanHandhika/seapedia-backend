import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { catalogService } from "../services/catalog.js";

export const listProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    const storeId =
      typeof req.query.storeId === "string" ? req.query.storeId : undefined;

    const minPrice =
      typeof req.query.minPrice === "string"
        ? Number(req.query.minPrice)
        : undefined;

    const maxPrice =
      typeof req.query.maxPrice === "string"
        ? Number(req.query.maxPrice)
        : undefined;

    const result = await catalogService.listProducts({
      page,
      limit,
      ...(search !== undefined ? { search } : {}),
      ...(storeId !== undefined ? { storeId } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    });

    return sendSuccess(res, result);
  },
);

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await catalogService.getProduct(req.params.id as string);

  return sendSuccess(res, product);
});

export const getStore = asyncHandler(async (req: Request, res: Response) => {
  const result = await catalogService.getStore(req.params.id as string);

  return sendSuccess(res, result);
});
