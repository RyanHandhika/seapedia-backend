import { Role } from "@prisma/client";

// Augments Express's Request type so authenticate()/authenticateRolePending()
// can attach typed user context that controllers/services read from.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles: Role[];
        activeRole: Role;
        sid: string;
      };
      rolePendingUser?: {
        id: string;
        roles: Role[];
      };
    }
  }
}

export {};
