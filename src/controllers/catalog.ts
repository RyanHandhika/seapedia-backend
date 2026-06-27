import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { catalogService } from "../services/catalog.js";

// After `validate(listProductsQuerySchema, "query")`, req.query holds parsed,
// coerced values: page/limit are numbers (with defaults applied), and the
// optional filters are numbers/strings or undefined. Read them directly.
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
