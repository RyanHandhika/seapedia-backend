import type { Request, Response } from "express";
import { Role } from "../generated/prisma/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";
import { authService } from "../services/auth.js";
import { summaryService } from "../services/summary.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  return sendSuccess(res, user, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, result);
});

export const selectRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.rolePendingUser) throw AppError.unauthorized();
  const result = await authService.selectRole(
    req.rolePendingUser,
    req.body.role as Role,
  );
  return sendSuccess(res, result);
});

export const switchRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await authService.switchRole(req.user, req.body.role as Role);
  return sendSuccess(res, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body.refreshToken);
  return sendSuccess(res, result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await authService.logout(req.user.sid);
  return sendSuccess(res, { message: "Logged out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const profile = await authService.getProfile(req.user.id);
  return sendSuccess(res, { ...profile, activeRole: req.user.activeRole });
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = summaryService.getSummary(req.user.roles, req.user.activeRole);
  return sendSuccess(res, result);
});
