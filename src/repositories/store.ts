import { prisma } from "../db/prisma.js";

export function findBySellerId(sellerId: string) {
  return prisma.store.findUnique({ where: { sellerId } });
}

export function findById(id: string) {
  return prisma.store.findUnique({ where: { id } });
}

export function findByStoreName(storeName: string) {
  return prisma.store.findUnique({ where: { storeName } });
}

export function updateStore(
  id: string,
  data: { storeName?: string; description?: string },
) {
  return prisma.store.update({ where: { id }, data });
}
