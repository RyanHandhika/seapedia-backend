import { Router } from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../middlewares/authenticate.js";
import { authenticateRolePending } from "../middlewares/authenticateRolePending.js";
import { validate } from "../middlewares/validate.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import { env } from "../config/env.js";
import {
  registerSchema,
  loginSchema,
  selectRoleSchema,
  switchRoleSchema,
  refreshSchema,
} from "../validators/auth.js";
import * as authController from "../controllers/auth.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register,
);
router.post("/login", authLimiter, validate(loginSchema), authController.login);

router.post(
  "/select-role",
  authenticateRolePending,
  validate(selectRoleSchema),
  authController.selectRole,
);

router.post(
  "/switch-role",
  authenticate(),
  validate(switchRoleSchema),
  authController.switchRole,
);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", authenticate(), authController.logout);
router.get("/me", authenticate(), authController.me);

// Debug endpoint — development only, never exposed in production.
if (env.nodeEnv !== "production") {
  router.get("/debug-token", (req, res) => {
    const authHeader = req.headers.authorization ?? "(no Authorization header)";
    const rawToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "(could not extract)";

    let decoded: unknown = null;
    let verifyError: string | null = null;
    try {
      decoded = jwt.verify(rawToken, env.jwt.accessSecret);
    } catch (err) {
      verifyError =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }

    return res.json({
      received: {
        authorizationHeader: authHeader,
        tokenPreview: rawToken.slice(0, 30) + "...",
      },
      decoded,
      verifyError,
      diagnosis: verifyError
        ? verifyError.includes("expired")
          ? "❌ Token expired — refresh or re-login"
          : verifyError.includes("invalid signature")
            ? "❌ Wrong secret — JWT_ACCESS_SECRET mismatch"
            : `❌ ${verifyError}`
        : "✅ Token valid",
    });
  });
}

export default router;
