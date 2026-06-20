import { Role } from "../generated/prisma/client.js";

// Level 1 only needs a placeholder per the brief: "create an entry point or
// placeholder for balance or financial summaries across roles owned by the
// same username." Real figures are wired in once their source models exist.
function getSummary(roles: Role[], activeRole: Role) {
  return {
    activeRole,
    roles,
    buyer: roles.includes(Role.BUYER)
      ? { walletBalance: null, note: "Wallet balance available from Level 3" }
      : null,
    seller: roles.includes(Role.SELLER)
      ? { storeIncome: null, note: "Store income available from Level 4" }
      : null,
    driver: roles.includes(Role.DRIVER)
      ? { driverEarnings: null, note: "Driver earnings available from Level 5" }
      : null,
  };
}

export const summaryService = { getSummary };
