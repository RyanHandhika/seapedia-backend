import { Role } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

export function findByUsernameOrEmail(identifier: string) {
  return prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
    include: { userRoles: true },
  });
}

// Used during registration to check both fields independently in one query.
export function findByUsernameOrEmailPair(username: string, email: string) {
  return prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
}

export function findById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { userRoles: true },
  });
}

export async function createUserWithRoles(input: {
  username: string;
  email: string;
  passwordHash: string;
  roles: Role[];
}) {
  return prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      userRoles: { create: input.roles.map((role) => ({ role })) },
    },
    include: { userRoles: true },
  });
}

export function findRolesByUserId(userId: string) {
  return prisma.userRole.findMany({ where: { userId } });
}

export function addRole(
  userId: string,
  role: import("../generated/prisma/client.js").Role,
) {
  return prisma.userRole.create({ data: { userId, role } });
}

export function hasRole(
  userId: string,
  role: import("../generated/prisma/client.js").Role,
) {
  return prisma.userRole.findUnique({
    where: { userId_role: { userId, role } },
  });
}
