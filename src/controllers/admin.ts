import type { Request, Response } from "express";
import { OrderStatus } from "../generated/prisma/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { adminService } from "../services/admin.js";

const pq = (req: Request) => {
  const q = req.query as unknown as { page: number; limit: number };
  return { page: q.page ?? 1, limit: q.limit ?? 10 };
};

export const getDashboard = asyncHandler(async (_req, res: Response) =>
  sendSuccess(res, await adminService.getDashboardSummary()),
);
export const listUsers = asyncHandler(async (req, res: Response) =>
  sendSuccess(
    res,
    await adminService.listUsers(
      ...(Object.values(pq(req)) as [number, number]),
    ),
  ),
);
export const listStores = asyncHandler(async (req, res: Response) =>
  sendSuccess(
    res,
    await adminService.listStores(
      ...(Object.values(pq(req)) as [number, number]),
    ),
  ),
);
export const listDeliveryJobs = asyncHandler(async (req, res: Response) =>
  sendSuccess(
    res,
    await adminService.listDeliveryJobs(
      ...(Object.values(pq(req)) as [number, number]),
    ),
  ),
);
export const listOverdueOrders = asyncHandler(async (req, res: Response) =>
  sendSuccess(
    res,
    await adminService.listOverdueOrders(
      ...(Object.values(pq(req)) as [number, number]),
    ),
  ),
);

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = pq(req);
  const status = req.query.status as OrderStatus | undefined;
  return sendSuccess(res, await adminService.listOrders(page, limit, status));
});

export const getTime = asyncHandler(async (_req, res: Response) =>
  sendSuccess(res, await adminService.getSimulatedTime()),
);
export const advanceDay = asyncHandler(async (req: Request, res: Response) => {
  const days = Number((req.body as { days?: number }).days ?? 1);
  return sendSuccess(res, await adminService.advanceDay(days));
});
export const resetTime = asyncHandler(async (_req, res: Response) =>
  sendSuccess(res, await adminService.resetTime()),
);
