// All monetary values in the DB are Prisma Decimal (stored as strings at
// runtime when accessed from JS). These helpers keep arithmetic predictable
// and prevent floating-point errors in checkout totals.

export function toNumber(value: unknown): number {
  return typeof value === "object" && value !== null
    ? parseFloat(String(value)) // Prisma Decimal object
    : Number(value);
}

// Round to 2 decimal places — matches the Decimal(12,2) DB columns.
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcCheckout(
  subtotal: number,
  discountAmount: number,
  deliveryFee: number,
  ppnRate = 0.12,
) {
  const afterDiscount = subtotal - discountAmount;
  const taxBase = afterDiscount + deliveryFee; // PPN applies AFTER discount + delivery
  const ppnAmount = round2(taxBase * ppnRate);
  const total = round2(taxBase + ppnAmount);

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    deliveryFee: round2(deliveryFee),
    ppnAmount,
    total,
  };
}
