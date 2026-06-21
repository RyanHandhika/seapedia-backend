import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { catalogService } from "../services/catalog.js";
import { AppError } from "../utils/appError.js";

export const listProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, search, storeId, minPrice, maxPrice } =
      req.query as unknown as {
        page: number;
        limit: number;
        search?: string;
        storeId?: string;
        minPrice?: number;
        maxPrice?: number;
      };
    const params: {
      page: number;
      limit: number;
      search?: string;
      storeId?: string;
      minPrice?: number;
      maxPrice?: number;
    } = {
      page,
      limit,
    };

    if (search !== undefined) {
      params.search = search;
    }

    if (storeId !== undefined) {
      params.storeId = storeId;
    }

    if (minPrice !== undefined) {
      params.minPrice = minPrice;
    }

    if (maxPrice !== undefined) {
      params.maxPrice = maxPrice;
    }

    const result = await catalogService.listProducts(params);
  },
);

export const getProduct = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (typeof id !== "string") {
    throw AppError.badRequest("Invalid product id");
  }

  const product = await catalogService.getProduct(id);

  return sendSuccess(res, product);
});

export const getStore = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (typeof id !== "string") {
    throw AppError.badRequest("Invalid store id");
  }

  const result = await catalogService.getStore(id);

  return sendSuccess(res, result);
});
