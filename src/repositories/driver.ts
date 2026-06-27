import { prisma } from "../db/prisma.js";

const jobWithOrder = {
  order: {
    select: {
      id: true,
      status: true,
      total: true,
      deliveryFee: true,
      deliveryMethod: true,
      dueAt: true,
      address: true,
      store: { select: { id: true, storeName: true } },
      buyer: { select: { id: true, username: true } },
    },
  },
};

export function listAvailable(page: number, limit: number) {
  return prisma.deliveryJob.findMany({
    where: { status: "AVAILABLE" },
    include: jobWithOrder,
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });
}

export function countAvailable() {
  return prisma.deliveryJob.count({ where: { status: "AVAILABLE" } });
}

export function findByIdPublic(id: string) {
  return prisma.deliveryJob.findUnique({
    where: { id },
    include: jobWithOrder,
  });
}

export function findActiveByDriver(driverId: string) {
  return prisma.deliveryJob.findFirst({
    where: { driverId, status: "TAKEN" },
    include: jobWithOrder,
  });
}

export async function listHistoryByDriver(
  driverId: string,
  page: number,
  limit: number,
) {
  const [data, total] = await Promise.all([
    prisma.deliveryJob.findMany({
      where: { driverId, status: "COMPLETED" },
      include: jobWithOrder,
      orderBy: { completedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deliveryJob.count({ where: { driverId, status: "COMPLETED" } }),
  ]);
  return { data, total };
}

export async function getEarnings(driverId: string, from?: Date, to?: Date) {
  const where = {
    driverId,
    ...(from || to
      ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : {}),
  };
  const [earnings, total] = await Promise.all([
    prisma.driverEarning.findMany({
      where,
      include: { deliveryJob: { select: { orderId: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.driverEarning.aggregate({ where, _sum: { amount: true } }),
  ]);
  return {
    data: earnings,
    totalEarned: parseFloat(String(total._sum.amount ?? 0)),
  };
}
