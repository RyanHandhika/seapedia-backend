import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { reviewService } from "../services/review.js";

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.submitReview({
    ...req.body,
    userId: req.user?.id,
    reviewerRole: req.user?.activeRole,
  });
  return sendSuccess(res, review, 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as {
    page: number;
    limit: number;
  };
  const result = await reviewService.listReviews(page, limit);
  return sendSuccess(res, result);
});
