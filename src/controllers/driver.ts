import type { Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { driverService } from "../services/driver.js";

const uid = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
};
const pq = (req: Request) =>
  req.query as unknown as { page: number; limit: number };

export const listAvailableJobs = asyncHandler(async (req, res: Response) => {
  const { page, limit } = pq(req);
  return sendSuccess(res, await driverService.listAvailableJobs(page, limit));
});

export const getJob = asyncHandler(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  return sendSuccess(res, await driverService.getJob(id));
});

export const takeJob = asyncHandler(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  return sendSuccess(res, await driverService.takeJob(uid(req), id));
});

export const completeJob = asyncHandler(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  return sendSuccess(res, await driverService.completeJob(uid(req), id));
});

export const getActiveJob = asyncHandler(async (req, res: Response) => {
  return sendSuccess(res, await driverService.getActiveJob(uid(req)));
});

export const getJobHistory = asyncHandler(async (req, res: Response) => {
  const { page, limit } = pq(req);
  return sendSuccess(
    res,
    await driverService.getJobHistory(uid(req), page, limit),
  );
});

export const getEarnings = asyncHandler(async (req, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  return sendSuccess(
    res,
    await driverService.getEarnings(
      uid(req),
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    ),
  );
});
