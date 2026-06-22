import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validate } from "../middlewares/validate.js";
import {
  createVoucherSchema,
  createPromoSchema,
  discountIdParamSchema,
  discountListQuerySchema,
} from "../validators/discount.js";
import * as discountController from "../controllers/discount.js";
import * as adminController from "../controllers/admin.js";

const router = Router();
router.use(authenticate(), requireRole("ADMIN"));

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard", adminController.getDashboard);

// ── Entity monitoring ─────────────────────────────────────────────────────────
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

router.get("/users", validate(pageQuery, "query"), adminController.listUsers);
router.get("/stores", validate(pageQuery, "query"), adminController.listStores);
router.get("/orders", validate(pageQuery, "query"), adminController.listOrders);
router.get(
  "/orders/overdue",
  validate(pageQuery, "query"),
  adminController.listOverdueOrders,
);
router.get(
  "/delivery-jobs",
  validate(pageQuery, "query"),
  adminController.listDeliveryJobs,
);

// ── Vouchers ──────────────────────────────────────────────────────────────────
router.get(
  "/vouchers",
  validate(discountListQuerySchema, "query"),
  discountController.listVouchers,
);
router.post(
  "/vouchers",
  validate(createVoucherSchema),
  discountController.createVoucher,
);
router.get(
  "/vouchers/:id",
  validate(discountIdParamSchema, "params"),
  discountController.getVoucher,
);

// ── Promos ────────────────────────────────────────────────────────────────────
router.get(
  "/promos",
  validate(discountListQuerySchema, "query"),
  discountController.listPromos,
);
router.post(
  "/promos",
  validate(createPromoSchema),
  discountController.createPromo,
);
router.get(
  "/promos/:id",
  validate(discountIdParamSchema, "params"),
  discountController.getPromo,
);

// ── Time simulation (for overdue demo) ───────────────────────────────────────
router.get("/system/time", adminController.getTime);
router.post("/system/advance-day", adminController.advanceDay);
router.post("/system/reset-time", adminController.resetTime);

export default router;
