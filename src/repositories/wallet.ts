import { WalletTransactionType } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

export function findByBuyerId(buyerId: string) {
  return prisma.wallet.findUnique({ where: { buyerId } });
}

// Called once during registration to guarantee every buyer has a wallet row.
export function createWallet(buyerId: string) {
  return prisma.wallet.create({ data: { buyerId, balance: 0 } });
}

export async function listTransactions(
  walletId: string,
  page: number,
  limit: number,
) {
  const [data, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.walletTransaction.count({ where: { walletId } }),
  ]);
  return { data, total };
}

// These two are called inside prisma.$transaction in checkout / topup —
// the caller passes the transaction client (tx) instead of the global prisma.
export function incrementBalance(
  tx: typeof prisma,
  walletId: string,
  amount: number,
) {
  return tx.wallet.update({
    where: { id: walletId },
    data: {
      balance: { increment: amount },
      transactions: {
        create: {
          type: WalletTransactionType.TOPUP,
          amount,
          description: "Top-up",
        },
      },
    },
  });
}

export function deductBalance(
  tx: typeof prisma,
  walletId: string,
  amount: number,
  description: string,
) {
  return tx.wallet.update({
    where: { id: walletId },
    data: {
      balance: { decrement: amount },
      transactions: {
        create: { type: WalletTransactionType.PAYMENT, amount, description },
      },
    },
  });
}
