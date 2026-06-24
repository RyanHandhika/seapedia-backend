import { WalletTransactionType } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { AppError } from "../utils/appError.js";
import { toNumber } from "../utils/money.js";
import * as walletRepository from "../repositories/wallet.js";

async function requireWallet(buyerId: string) {
  const wallet = await walletRepository.findByBuyerId(buyerId);
  if (!wallet) throw AppError.notFound("Wallet not found.");
  return wallet;
}

async function getBalance(buyerId: string) {
  const wallet = await requireWallet(buyerId);
  return { balance: toNumber(wallet.balance), walletId: wallet.id };
}

async function topup(buyerId: string, amount: number) {
  const wallet = await requireWallet(buyerId);

  const updated = await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: { increment: amount },
      transactions: {
        create: {
          type: WalletTransactionType.TOPUP,
          amount,
          description: `Top-up Rp ${amount.toLocaleString("id-ID")}`,
        },
      },
    },
  });

  return { balance: toNumber(updated.balance) };
}

async function listTransactions(buyerId: string, page: number, limit: number) {
  const wallet = await requireWallet(buyerId);
  const { data, total } = await walletRepository.listTransactions(
    wallet.id,
    page,
    limit,
  );
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export const walletService = { getBalance, topup, listTransactions };
