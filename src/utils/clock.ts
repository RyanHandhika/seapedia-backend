import { prisma } from "../db/prisma.js";

// Every piece of code that needs "now" should call this instead of new Date()
// so the Admin "advance day" trigger (Level 6) affects all time-sensitive logic
// automatically without touching anything else.
export async function now(): Promise<Date> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key: "SIMULATED_DATE" },
    });
    if (row?.value) return new Date(row.value);
  } catch {
    // DB not reachable during boot / tests — silently fall through.
  }
  return new Date();
}

// Synchronous fallback used where an async call is impractical (e.g. inside a
// Prisma $transaction callback that is already async but tightly sequenced).
// Callers that need true simulation should call now() beforehand and pass the
// result in, rather than calling this.
export function nowSync(): Date {
  return new Date();
}
