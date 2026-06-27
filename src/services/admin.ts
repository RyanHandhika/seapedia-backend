import { OrderStatus } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { now } from "../utils/clock.js";

async function getDashboardSummary() {
  const currentDate = await now();

  const [
    totalUsers,
    totalStores,
    totalProducts,
    totalOrders,
    totalVouchers,
    totalPromos,
    totalDeliveryJobs,
    overdueOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.voucher.count(),
    prisma.promo.count(),
    prisma.deliveryJob.count(),
    // Overdue = active orders past their dueAt
    prisma.order.count({
      where: {
        status: {
          in: [
            OrderStatus.SEDANG_DIKEMAS,
            OrderStatus.MENUNGGU_PENGIRIM,
            OrderStatus.SEDANG_DIKIRIM,
          ],
        },
        dueAt: { lt: currentDate },
        overdueCheckedAt: null,
      },
    }),
  ]);

  return {
    users: totalUsers,
    stores: totalStores,
    products: totalProducts,
    orders: totalOrders,
    vouchers: totalVouchers,
    promos: totalPromos,
    deliveryJobs: totalDeliveryJobs,
    overdueOrders,
    simulatedDate: currentDate,
  };
}

async function listUsers(page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        userRoles: { select: { role: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count(),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function listStores(page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.store.findMany({
      include: {
        seller: { select: { id: true, username: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.store.count(),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function listOrders(page: number, limit: number, status?: OrderStatus) {
  const where = status ? { status } : {};
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, username: true } },
        store: { select: { id: true, storeName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function listOverdueOrders(page: number, limit: number) {
  const currentDate = await now();
  const where = {
    status: {
      in: [
        OrderStatus.SEDANG_DIKEMAS,
        OrderStatus.MENUNGGU_PENGIRIM,
        OrderStatus.SEDANG_DIKIRIM,
      ] as OrderStatus[],
    },
    dueAt: { lt: currentDate },
    overdueCheckedAt: null,
  };
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { username: true } },
        store: { select: { storeName: true } },
      },
      orderBy: { dueAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function listDeliveryJobs(page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.deliveryJob.findMany({
      include: {
        order: { select: { id: true, total: true, status: true } },
        driver: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deliveryJob.count(),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Time simulation — used for demo and overdue testing
async function getSimulatedTime() {
  const row = await prisma.systemConfig.findUnique({
    where: { key: "SIMULATED_DATE" },
  });
  return {
    simulatedDate: row ? new Date(row.value) : new Date(),
    isSimulated: !!row,
  };
}

async function advanceDay(days = 1) {
  const current = await now();
  const next = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);
  await prisma.systemConfig.upsert({
    where: { key: "SIMULATED_DATE" },
    update: { value: next.toISOString() },
    create: { key: "SIMULATED_DATE", value: next.toISOString() },
  });

  // Auto-run overdue check with the new time so the demo shows the effect immediately.
  const { runOverdueCheck } = await import("../services/overdue.js");
  const overdueResult = await runOverdueCheck();

  return {
    simulatedDate: next,
    advancedDays: days,
    overdueCheck: overdueResult,
  };
}

async function resetTime() {
  await prisma.systemConfig.deleteMany({ where: { key: "SIMULATED_DATE" } });
  return { simulatedDate: new Date(), isSimulated: false };
}

export const adminService = {
  getDashboardSummary,
  listUsers,
  listStores,
  listOrders,
  listOverdueOrders,
  listDeliveryJobs,
  getSimulatedTime,
  advanceDay,
  resetTime,
};
