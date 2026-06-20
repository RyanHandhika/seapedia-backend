import jwt from "jsonwebtoken";
import { Role } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string;
  roles: Role[];
  activeRole: Role;
  sid: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
}

export interface RolePendingTokenPayload {
  sub: string;
  roles: Role[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // env.jwt.accessTtl is a plain `string` (read from process.env), but the
  // installed @types/jsonwebtoken narrows `expiresIn` to a template-literal
  // union (e.g. "15m"). The cast is safe: parseDurationMs() elsewhere
  // already validates the same string shape against that pattern.
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}

export function signRolePendingToken(payload: RolePendingTokenPayload): string {
  return jwt.sign(payload, env.jwt.rolePendingSecret, {
    expiresIn: env.jwt.rolePendingTtl,
  } as jwt.SignOptions);
}

export function verifyRolePendingToken(token: string): RolePendingTokenPayload {
  return jwt.verify(
    token,
    env.jwt.rolePendingSecret,
  ) as RolePendingTokenPayload;
}
