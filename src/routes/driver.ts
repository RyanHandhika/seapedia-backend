import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validate } from "../middlewares/validate.js";
import {
  jobIdParamSchema,
  driverJobQuerySchema,
} from "../validators/driver.js";
import * as driverController from "../controllers/driver.js";

const router = Router();
router.use(authenticate(), requireRole("DRIVER"));

// ── Job discovery ─────────────────────────────────────────────────────────────
router.get(
  "/jobs/available",
  validate(driverJobQuerySchema, "query"),
  driverController.listAvailableJobs,
);
router.get("/jobs/active", driverController.getActiveJob);
router.get(
  "/jobs/history",
  validate(driverJobQuerySchema, "query"),
  driverController.getJobHistory,
);
router.get(
  "/jobs/:id",
  validate(jobIdParamSchema, "params"),
  driverController.getJob,
);

// ── Job actions ───────────────────────────────────────────────────────────────
router.post(
  "/jobs/:id/take",
  validate(jobIdParamSchema, "params"),
  driverController.takeJob,
);
router.post(
  "/jobs/:id/complete",
  validate(jobIdParamSchema, "params"),
  driverController.completeJob,
);

// ── Earnings ──────────────────────────────────────────────────────────────────
router.get("/earnings", driverController.getEarnings);

export default router;
