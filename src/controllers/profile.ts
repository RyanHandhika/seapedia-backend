import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";
import { profileService } from "../services/profile.js";

export const becomeSeller = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();

    const result = await profileService.becomeSeller({
      userId: req.user.id,
      storeName: req.body.storeName,
      description: req.body.description,
    });

    // 201 Created: a new Store resource was created as part of this action.
    return sendSuccess(res, result, 201);
  },
);

export const becomeDriver = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();

    const result = await profileService.becomeDriver(req.user.id);
    return sendSuccess(res, result, 201);
  },
);

export const myRoles = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const roles = await profileService.getOwnedRoles(req.user.id);
  return sendSuccess(res, { roles, activeRole: req.user.activeRole });
});
