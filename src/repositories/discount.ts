import { prisma } from "../db/prisma.js";

// ── Voucher ───────────────────────────────────────────────────────────────────

export function createVoucher(data: {
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  expiryDate: Date;
  usageLimit: number;
}) {
  return prisma.voucher.create({ data });
}

export function findVoucherByCode(code: string) {
  return prisma.voucher.findUnique({ where: { code } });
}

export function findVoucherById(id: string) {
  return prisma.voucher.findUnique({ where: { id } });
}

export async function listVouchers(page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.voucher.count(),
  ]);
  return { data, total };
}

// ── Promo ─────────────────────────────────────────────────────────────────────

export function createPromo(data: {
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  expiryDate: Date;
  description?: string;
}) {
  return prisma.promo.create({ data });
}

export function findPromoByCode(code: string) {
  return prisma.promo.findUnique({ where: { code } });
}

export function findPromoById(id: string) {
  return prisma.promo.findUnique({ where: { id } });
}

export async function listPromos(page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.promo.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.promo.count(),
  ]);
  return { data, total };
}
