import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { productService } from "../services/product.js";
import { uploadProductImage } from "../middlewares/upload.js";

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();

    // uploadProductImage reads req.file (populated by the parseImage middleware
    // that runs before this controller) and sends it to Supabase if present.
    const imageUrl = await uploadProductImage(req);

    const product = await productService.createProduct(req.user.id, {
      ...req.body,
      imageUrl,
    });
    return sendSuccess(res, product, 201);
  },
);

export const listMyProducts = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { page, limit, search } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
    };
    const result = await productService.listMyProducts(
      req.user.id,
      page,
      limit,
      search,
    );
    return sendSuccess(res, result);
  },
);

export const getMyProduct = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { id } = req.params as { id: string };
    const product = await productService.getMyProduct(req.user.id, id);
    return sendSuccess(res, product);
  },
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();

    const newImageUrl = await uploadProductImage(req);
    const { id } = req.params as { id: string };
    const product = await productService.updateProduct(req.user.id, id, {
      ...req.body,
      newImageUrl,
    });
    return sendSuccess(res, product);
  },
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { id } = req.params as { id: string };
    const result = await productService.deleteProduct(req.user.id, id);
    return sendSuccess(res, result);
  },
);
