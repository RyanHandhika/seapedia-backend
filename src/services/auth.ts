import { randomUUID } from "crypto";
import { Role } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { hashToken } from "../utils/tokenHash.js";
import { parseDurationMs } from "../utils/duration.js";
import {
  signAccessToken,
  signRefreshToken,
  signRolePendingToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import * as userRepository from "../repositories/user.js";
import * as refreshTokenRepository from "../repositories/refreshToken.js";

interface RegisterInput {
  username: string;
  email: string;
  password: string;
  // No roles[] here intentionally. Every account starts as BUYER.
  // SELLER is granted via "Open Store" in profile (profile.service).
  // DRIVER is granted via "Join as Driver" (profile.service).
  // This mirrors the Shopee/Tokopedia UX pattern.
}

async function register(input: RegisterInput) {
  const existing = await userRepository.findByUsernameOrEmailPair(
    input.username,
    input.email,
  );
  if (existing) {
    throw AppError.conflict("Username or email is already registered");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepository.createUserWithRoles({
    username: input.username,
    email: input.email,
    passwordHash,
    roles: [Role.BUYER], // always BUYER on registration
  });

  return toSafeUser(user);
}

interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

async function login(input: LoginInput) {
  const user = await userRepository.findByUsernameOrEmail(
    input.usernameOrEmail,
  );
  if (!user) throw AppError.unauthorized("Invalid credentials");

  const passwordMatches = await comparePassword(
    input.password,
    user.passwordHash,
  );
  if (!passwordMatches) throw AppError.unauthorized("Invalid credentials");

  const roles = user.userRoles.map((ur: { role: Role }) => ur.role);
  if (roles.length === 0) {
    throw AppError.forbidden("Account has no assigned role. Contact support.");
  }

  // Admin is single-role by design; same for any user who only owns one
  // non-admin role — neither needs the role-selection handshake.
  if (roles.includes(Role.ADMIN) || roles.length === 1) {
    const activeRole = roles.includes(Role.ADMIN) ? Role.ADMIN : roles[0];
    const session = await issueFullSession(user.id, roles, activeRole!);
    return { requiresRoleSelection: false, roles, ...session };
  }

  // Multi-role user: do NOT issue a usable session yet. Per the brief,
  // "a user with multiple non-admin roles must not be redirected to a
  // private dashboard before choosing an active role."
  const rolePendingToken = signRolePendingToken({ sub: user.id, roles });
  return { requiresRoleSelection: true, roles, rolePendingToken };
}

async function selectRole(
  rolePendingUser: { id: string; roles: Role[] },
  role: Role,
) {
  if (!rolePendingUser.roles.includes(role)) {
    throw AppError.forbidden("You do not own the requested role");
  }
  const session = await issueFullSession(
    rolePendingUser.id,
    rolePendingUser.roles,
    role,
  );
  return { activeRole: role, ...session };
}

async function switchRole(
  currentUser: { id: string; sid: string },
  role: Role,
) {
  // Re-fetch from the DB rather than trusting the roles[] already in the
  // access token, so a role revoked mid-session can't still be switched to.
  const ownedRoles = await fetchOwnedRoles(currentUser.id);
  if (!ownedRoles.includes(role)) {
    throw AppError.forbidden("You do not own the requested role");
  }

  await refreshTokenRepository.updateActiveRole(currentUser.sid, role);
  const accessToken = signAccessToken({
    sub: currentUser.id,
    roles: ownedRoles,
    activeRole: role,
    sid: currentUser.sid,
  });

  return { accessToken, activeRole: role };
}

async function refresh(refreshTokenPlain: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenPlain);
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshTokenPlain);
  const stored = await refreshTokenRepository.findActiveByHash(tokenHash);
  if (
    !stored ||
    stored.userId !== payload.sub ||
    stored.expiresAt < new Date()
  ) {
    throw AppError.unauthorized("Refresh session is no longer valid");
  }

  const ownedRoles = await fetchOwnedRoles(payload.sub);
  const accessToken = signAccessToken({
    sub: payload.sub,
    roles: ownedRoles,
    activeRole: stored.activeRole ?? ownedRoles[0]!,
    sid: payload.sid,
  });

  return { accessToken };
}

async function logout(sid: string) {
  await refreshTokenRepository.revokeById(sid);
}

async function getProfile(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.notFound("User not found");
  return toSafeUser(user);
}

// --- internal helpers -------------------------------------------------

async function issueFullSession(
  userId: string,
  roles: Role[],
  activeRole: Role,
) {
  const sid = randomUUID();
  const refreshTokenPlain = signRefreshToken({ sub: userId, sid });
  const tokenHash = hashToken(refreshTokenPlain);
  const expiresAt = new Date(Date.now() + parseDurationMs(env.jwt.refreshTtl));

  await refreshTokenRepository.createRefreshToken({
    id: sid,
    userId,
    tokenHash,
    activeRole,
    expiresAt,
  });

  const accessToken = signAccessToken({ sub: userId, roles, activeRole, sid });

  return { accessToken, refreshToken: refreshTokenPlain };
}

async function fetchOwnedRoles(userId: string): Promise<Role[]> {
  const rows = await userRepository.findRolesByUserId(userId);
  return rows.map((r: { role: Role }) => r.role);
}

function toSafeUser(user: {
  id: string;
  username: string;
  email: string;
  userRoles: { role: Role }[];
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.userRoles.map((ur) => ur.role),
  };
}

export const authService = {
  register,
  login,
  selectRole,
  switchRole,
  refresh,
  logout,
  getProfile,
};
