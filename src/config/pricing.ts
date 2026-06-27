import { DeliveryMethod } from "../generated/prisma/client.js";

// ── Delivery fees (IDR) ──────────────────────────────────────────────────────
export const DELIVERY_FEE: Record<DeliveryMethod, number> = {
  INSTANT: 50_000,
  NEXT_DAY: 25_000,
  REGULAR: 15_000,
};

// ── SLA in hours — how long before an unfinished order goes overdue ──────────
// Used at checkout to stamp Order.dueAt, and by the overdue worker (Level 6).
export const DELIVERY_SLA_HOURS: Record<DeliveryMethod, number> = {
  INSTANT: 3,
  NEXT_DAY: 24,
  REGULAR: 72,
};

// ── Tax ─────────────────────────────────────────────────────────────────────
export const PPN_RATE = 0.12; // 12%

// ── Driver earning cut ───────────────────────────────────────────────────────
export const DRIVER_EARNING_RATE = 0.8; // driver keeps 80% of delivery fee
