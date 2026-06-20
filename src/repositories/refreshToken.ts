import { Role } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

export function createRefreshToken(input: {
  id: string;
  userId: string;
  tokenHash: string;
  activeRole: Role;
  expiresAt: Date;
}) {
  return prisma.refreshToken.create({
    data: {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      activeRole: input.activeRole,
      expiresAt: input.expiresAt,
    },
  });
}

export function findActiveByHash(tokenHash: string) {
  return prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null },
  });
}

export function revokeById(id: string) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export function updateActiveRole(id: string, activeRole: Role) {
  return prisma.refreshToken.update({
    where: { id },
    data: { activeRole },
  });
}
