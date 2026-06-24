import { Role } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { toNumber } from "../utils/money.js";

async function getSummary(userId: string, roles: Role[], activeRole: Role) {
  const [wallet, store] = await Promise.all([
    roles.includes(Role.BUYER)
      ? prisma.wallet.findUnique({ where: { buyerId: userId } })
      : Promise.resolve(null),
    roles.includes(Role.SELLER)
      ? prisma.store.findUnique({ where: { sellerId: userId } })
      : Promise.resolve(null),
  ]);

  return {
    activeRole,
    roles,
    buyer: roles.includes(Role.BUYER)
      ? { walletBalance: wallet ? toNumber(wallet.balance) : 0 }
      : null,
    seller: roles.includes(Role.SELLER)
      ? { storeName: store?.storeName ?? null, storeIncome: null }
      : null,
    driver: roles.includes(Role.DRIVER)
      ? { driverEarnings: null, note: "Driver earnings available from Level 5" }
      : null,
  };
}

export const summaryService = { getSummary };
