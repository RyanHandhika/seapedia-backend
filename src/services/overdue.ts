import {
  DeliveryMethod,
  OrderStatus,
  WalletTransactionType,
} from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { toNumber } from "../utils/money.js";
import { now } from "../utils/clock.js";

export interface OverdueResult {
  orderId: string;
  action: "REFUNDED" | "RETURNED";
  reason: string;
}

// Processes a single overdue order inside its own transaction.
// REFUND  → INSTANT or NEXT_DAY: credit buyer wallet + restore stock.
// RETURN  → REGULAR: change status only (physical return assumed separately).
async function processOne(
  orderId: string,
  currentTime: Date,
): Promise<OverdueResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        buyer: { include: { wallet: true } },
      },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    const shouldRefund =
      order.deliveryMethod === DeliveryMethod.INSTANT ||
      order.deliveryMethod === DeliveryMethod.NEXT_DAY;

    if (shouldRefund && order.buyer.wallet) {
      // 1. Credit buyer wallet.
      await tx.wallet.update({
        where: { id: order.buyer.wallet.id },
        data: {
          balance: { increment: toNumber(order.total) },
          transactions: {
            create: {
              type: WalletTransactionType.REFUND,
              amount: toNumber(order.total),
              description: `Auto-refund for overdue order #${order.id.slice(-8).toUpperCase()} (${order.deliveryMethod})`,
            },
          },
        },
      });

      // 2. Restore stock for each item.
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    // 3. Mark order as returned + stamp overdueCheckedAt.
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DIKEMBALIKAN,
        overdueCheckedAt: currentTime,
      },
    });

    // 4. Append status history entry so the timeline is traceable.
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: OrderStatus.DIKEMBALIKAN,
        changedAt: currentTime,
        note: shouldRefund
          ? `Auto-refunded: order overdue (${order.deliveryMethod}). Rp ${toNumber(order.total).toLocaleString("id-ID")} returned to wallet.`
          : `Auto-returned: order overdue (${order.deliveryMethod}). Physical return process required.`,
      },
    });

    return {
      orderId,
      action: shouldRefund ? "REFUNDED" : "RETURNED",
      reason: `${order.deliveryMethod} order exceeded SLA deadline`,
    } as OverdueResult;
  });
}

// Finds all eligible overdue orders and processes them one by one.
// Each order is its own transaction — a failure on one doesn't roll back others.
export async function runOverdueCheck() {
  const currentTime = await now();

  const candidates = await prisma.order.findMany({
    where: {
      status: {
        in: [
          OrderStatus.SEDANG_DIKEMAS,
          OrderStatus.MENUNGGU_PENGIRIM,
          OrderStatus.SEDANG_DIKIRIM,
        ],
      },
      dueAt: { lt: currentTime },
      overdueCheckedAt: null,
    },
    select: { id: true },
  });

  const results: Array<
    OverdueResult | { orderId: string; action: "ERROR"; reason: string }
  > = [];

  for (const { id } of candidates) {
    try {
      results.push(await processOne(id, currentTime));
    } catch (err) {
      // Log but continue — don't let one bad order block the rest.
      console.error(`[overdue] Failed to process order ${id}:`, err);
      results.push({ orderId: id, action: "ERROR", reason: String(err) });
    }
  }

  return {
    checkedAt: currentTime,
    processed: results.length,
    results,
  };
}
