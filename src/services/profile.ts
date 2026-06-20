import { Role } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";
import { AppError } from "../utils/appError.js";
import * as userRepository from "../repositories/user.js";

// ─── Become Seller ───────────────────────────────────────────────────────────
// Grants the SELLER role AND creates the store stub atomically in one
// transaction so there is never a SELLER without a Store or a Store without
// a SELLER role on the account. This mirrors how Tokopedia / Shopee work:
// tapping "Open Store" asks for a store name and immediately grants access.
interface BecomeSellerInput {
  userId: string;
  storeName: string;
  description?: string;
}

async function becomeSeller(input: BecomeSellerInput) {
  // Idempotency guard — re-opening "Buka Toko" on an already-seller account
  // should show the existing store, not throw an error, so we check first.
  const alreadySeller = await userRepository.hasRole(input.userId, Role.SELLER);
  if (alreadySeller) {
    throw AppError.conflict(
      "You already have a Seller account. Go to your store dashboard to manage it.",
    );
  }

  // Check store name uniqueness before entering the transaction so the
  // error message is clear.  The DB unique constraint is the real guard;
  // this check just gives a friendlier error than a Prisma constraint error.
  const nameConflict = await prisma.store.findUnique({
    where: { storeName: input.storeName },
  });
  if (nameConflict) {
    throw AppError.conflict(
      "That store name is already taken. Please choose a different name.",
    );
  }

  // Atomic: role grant + store creation together.
  const [, store] = await prisma.$transaction([
    prisma.userRole.create({
      data: { userId: input.userId, role: Role.SELLER },
    }),
    prisma.store.create({
      data: {
        sellerId: input.userId,
        storeName: input.storeName,
        ...(input.description !== undefined && {
          description: input.description,
        }),
      },
    }),
  ]);

  return {
    message: "Seller account opened successfully.",
    store: {
      id: store.id,
      storeName: store.storeName,
      description: store.description,
    },
  };
}

// ─── Become Driver ───────────────────────────────────────────────────────────
async function becomeDriver(userId: string) {
  const alreadyDriver = await userRepository.hasRole(userId, Role.DRIVER);
  if (alreadyDriver) {
    throw AppError.conflict("You already have a Driver account.");
  }

  await userRepository.addRole(userId, Role.DRIVER);

  return {
    message: "Driver account activated. You can now take delivery jobs.",
  };
}

// ─── Get profile (all roles the user currently owns) ─────────────────────────
async function getOwnedRoles(userId: string) {
  const rows = await userRepository.findRolesByUserId(userId);
  return rows.map((r: { role: Role }) => r.role);
}

export const profileService = { becomeSeller, becomeDriver, getOwnedRoles };
