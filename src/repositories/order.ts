import { OrderStatus } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

export function findByIdForBuyer(orderId: string, buyerId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, buyerId },
    include: {
      orderItems: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
      statusHistory: { orderBy: { changedAt: "asc" } },
      deliveryJob: { select: { id: true, status: true, driverId: true } },
      address: true,
      store: { select: { id: true, storeName: true } },
    },
  });
}

export async function listForBuyer(
  buyerId: string,
  page: number,
  limit: number,
  status?: OrderStatus,
) {
  const where = { buyerId, ...(status && { status }) };
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        store: { select: { id: true, storeName: true } },
        orderItems: { take: 1 }, // preview only
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  return { data, total };
}

// Spending report: sum of totals for completed orders in a date range.
export async function getSpendingSummary(
  buyerId: string,
  from?: Date,
  to?: Date,
) {
  const where = {
    buyerId,
    status: OrderStatus.PESANAN_SELESAI,
    ...(from || to
      ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : {}),
  };
  const orders = await prisma.order.findMany({
    where,
    select: { total: true, createdAt: true },
  });
  const totalSpent = orders.reduce(
    (sum: number, o: { total: unknown }) => sum + parseFloat(String(o.total)),
    0,
  );
  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalOrders: orders.length,
  };
}

// Seller view
export async function listForSeller(
  storeId: string,
  page: number,
  limit: number,
  status?: OrderStatus,
) {
  const where = { storeId, ...(status && { status }) };
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, username: true } },
        orderItems: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  return { data, total };
}

export function findByIdForSeller(orderId: string, storeId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: {
      orderItems: { include: { product: true } },
      statusHistory: { orderBy: { changedAt: "asc" } },
      buyer: { select: { id: true, username: true } },
      address: true,
    },
  });
}

export async function getIncomeSummary(
  storeId: string,
  from?: Date,
  to?: Date,
) {
  const where = {
    storeId,
    status: OrderStatus.PESANAN_SELESAI,
    ...(from || to
      ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
      : {}),
  };
  const orders = await prisma.order.findMany({
    where,
    select: { total: true },
  });
  const totalIncome = orders.reduce(
    (sum: number, o: { total: unknown }) => sum + parseFloat(String(o.total)),
    0,
  );
  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalOrders: orders.length,
  };
}
