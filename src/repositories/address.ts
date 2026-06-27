import { prisma } from "../db/prisma.js";

export function listByBuyerId(buyerId: string) {
  return prisma.address.findMany({
    where: { buyerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export function findOwned(addressId: string, buyerId: string) {
  return prisma.address.findFirst({ where: { id: addressId, buyerId } });
}

export function create(data: {
  buyerId: string;
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  isDefault: boolean;
}) {
  return prisma.address.create({ data });
}

export function update(
  id: string,
  data: Partial<{
    label: string;
    recipientName: string;
    phone: string;
    fullAddress: string;
    isDefault: boolean;
  }>,
) {
  return prisma.address.update({ where: { id }, data });
}

export function remove(id: string) {
  return prisma.address.delete({ where: { id } });
}

// Clears isDefault on every other address for this buyer before setting a
// new default — ensures only one default address at a time.
export async function setDefault(id: string, buyerId: string) {
  await prisma.address.updateMany({
    where: { buyerId, isDefault: true },
    data: { isDefault: false },
  });
  return prisma.address.update({ where: { id }, data: { isDefault: true } });
}
