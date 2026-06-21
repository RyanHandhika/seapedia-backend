import { OrderStatus } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { AppError } from "../utils/appError.js";
import * as orderRepository from "../repositories/order.js";
import * as storeRepository from "../repositories/store.js";
import { Prisma } from "../generated/prisma/client.js";

// ── Buyer ────────────────────────────────────────────────────────────────────

async function listForBuyer(
  buyerId: string,
  page: number,
  limit: number,
  status?: string,
) {
  const validStatus =
    status && Object.values(OrderStatus).includes(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined;
  const { data, total } = await orderRepository.listForBuyer(
    buyerId,
    page,
    limit,
    validStatus,
  );
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getForBuyer(buyerId: string, orderId: string) {
  const order = await orderRepository.findByIdForBuyer(orderId, buyerId);
  if (!order) throw AppError.notFound("Order not found.");
  return order;
}

async function spendingReport(buyerId: string, from?: Date, to?: Date) {
  return orderRepository.getSpendingSummary(buyerId, from, to);
}

// ── Seller ───────────────────────────────────────────────────────────────────

async function listForSeller(
  sellerId: string,
  page: number,
  limit: number,
  status?: string,
) {
  const store = await storeRepository.findBySellerId(sellerId);
  if (!store) throw AppError.notFound("Store not found.");

  const validStatus =
    status && Object.values(OrderStatus).includes(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined;
  const { data, total } = await orderRepository.listForSeller(
    store.id,
    page,
    limit,
    validStatus,
  );
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getForSeller(sellerId: string, orderId: string) {
  const store = await storeRepository.findBySellerId(sellerId);
  if (!store) throw AppError.notFound("Store not found.");
  const order = await orderRepository.findByIdForSeller(orderId, store.id);
  if (!order) throw AppError.notFound("Order not found in your store.");
  return order;
}

// Seller "processes" an order: SEDANG_DIKEMAS → MENUNGGU_PENGIRIM
// Also creates the DeliveryJob so drivers can see it (Level 5).
async function processOrder(sellerId: string, orderId: string) {
  const store = await storeRepository.findBySellerId(sellerId);
  if (!store) throw AppError.notFound("Store not found.");

  const order = await orderRepository.findByIdForSeller(orderId, store.id);
  if (!order) throw AppError.notFound("Order not found in your store.");
  if (order.status !== OrderStatus.SEDANG_DIKEMAS) {
    throw AppError.conflict(`Order is already in status: ${order.status}.`);
  }

  const updated = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.MENUNGGU_PENGIRIM },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.MENUNGGU_PENGIRIM,
          note: "Order processed by seller.",
        },
      });
      await tx.deliveryJob.create({ data: { orderId } });
      return o;
    },
  );

  return updated;
}

async function incomeReport(sellerId: string, from?: Date, to?: Date) {
  const store = await storeRepository.findBySellerId(sellerId);
  if (!store) throw AppError.notFound("Store not found.");
  return orderRepository.getIncomeSummary(store.id, from, to);
}

export const orderService = {
  listForBuyer,
  getForBuyer,
  spendingReport,
  listForSeller,
  getForSeller,
  processOrder,
  incomeReport,
};
