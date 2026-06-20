import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { authenticateRolePending } from "../middlewares/authenticateRolePending.js";
import { validate } from "../middlewares/validate.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
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

// Step 2 of the active-role handshake: requires the short-lived
// role-pending token returned by /login, NOT a normal access token.
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

export default router;
