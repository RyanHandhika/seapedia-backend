import { AppError } from "../utils/appError.js";
import { toNumber } from "../utils/money.js";
import { now } from "../utils/clock.js";
import * as discountRepository from "../repositories/discount.js";

// ── Admin: Voucher ────────────────────────────────────────────────────────────

async function createVoucher(input: {
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  expiryDate: Date;
  usageLimit: number;
}) {
  const existing = await discountRepository.findVoucherByCode(input.code);
  if (existing)
    throw AppError.conflict(`Voucher code "${input.code}" already exists.`);

  return discountRepository.createVoucher(input);
}

async function listVouchers(page: number, limit: number) {
  const { data, total } = await discountRepository.listVouchers(page, limit);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getVoucher(id: string) {
  const voucher = await discountRepository.findVoucherById(id);
  if (!voucher) throw AppError.notFound("Voucher not found.");
  return voucher;
}

// ── Admin: Promo ──────────────────────────────────────────────────────────────

async function createPromo(input: {
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  expiryDate: Date;
  description?: string;
}) {
  const existing = await discountRepository.findPromoByCode(input.code);
  if (existing)
    throw AppError.conflict(`Promo code "${input.code}" already exists.`);

  return discountRepository.createPromo(input);
}

async function listPromos(page: number, limit: number) {
  const { data, total } = await discountRepository.listPromos(page, limit);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getPromo(id: string) {
  const promo = await discountRepository.findPromoById(id);
  if (!promo) throw AppError.notFound("Promo not found.");
  return promo;
}

// ── Buyer: validate a code before checkout ────────────────────────────────────
// Used by GET /discounts/validate so the frontend can show the discount
// effect in real-time as the buyer types the code — without committing
// to a checkout yet.
async function validateCode(code: string, subtotal: number) {
  const currentDate = await now();

  // Try voucher first.
  const voucher = await discountRepository.findVoucherByCode(code);
  if (voucher) {
    if (voucher.expiryDate < currentDate) {
      return { valid: false, reason: "Voucher has expired." };
    }
    if (voucher.usedCount >= voucher.usageLimit) {
      return { valid: false, reason: "Voucher usage limit has been reached." };
    }
    const discountAmount =
      voucher.discountType === "PERCENT"
        ? Math.min(subtotal * (toNumber(voucher.value) / 100), subtotal)
        : Math.min(toNumber(voucher.value), subtotal);

    return {
      valid: true,
      type: "VOUCHER",
      discountType: voucher.discountType,
      value: toNumber(voucher.value),
      discountAmount: Math.round(discountAmount * 100) / 100,
      remaining: voucher.usageLimit - voucher.usedCount,
      expiryDate: voucher.expiryDate,
    };
  }

  // Try promo.
  const promo = await discountRepository.findPromoByCode(code);
  if (promo) {
    if (promo.expiryDate < currentDate) {
      return { valid: false, reason: "Promo has expired." };
    }
    const discountAmount =
      promo.discountType === "PERCENT"
        ? Math.min(subtotal * (toNumber(promo.value) / 100), subtotal)
        : Math.min(toNumber(promo.value), subtotal);

    return {
      valid: true,
      type: "PROMO",
      discountType: promo.discountType,
      value: toNumber(promo.value),
      discountAmount: Math.round(discountAmount * 100) / 100,
      description: promo.description,
      expiryDate: promo.expiryDate,
    };
  }

  return { valid: false, reason: "Discount code not found." };
}

export const discountService = {
  createVoucher,
  listVouchers,
  getVoucher,
  createPromo,
  listPromos,
  getPromo,
  validateCode,
};
