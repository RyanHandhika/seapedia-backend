import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validate } from "../middlewares/validate.js";
import { parseImage } from "../middlewares/upload.js";
import { updateStoreSchema } from "../validators/store.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  listProductsQuerySchema,
} from "../validators/products.js";
import * as storeController from "../controllers/store.js";
import * as productController from "../controllers/product.js";
import * as orderController from "../controllers/order.js";

const router = Router();
router.use(authenticate(), requireRole("SELLER"));

// ── Store ─────────────────────────────────────────────────────────────────────
router.get("/store", storeController.getMyStore);
router.put(
  "/store",
  validate(updateStoreSchema),
  storeController.updateMyStore,
);

// ── Products ──────────────────────────────────────────────────────────────────
router.get(
  "/products",
  validate(listProductsQuerySchema, "query"),
  productController.listMyProducts,
);
router.post(
  "/products",
  parseImage,
  validate(createProductSchema),
  productController.createProduct,
);
router.get(
  "/products/:id",
  validate(productIdParamSchema, "params"),
  productController.getMyProduct,
);
router.put(
  "/products/:id",
  parseImage,
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  productController.updateProduct,
);
router.delete(
  "/products/:id",
  validate(productIdParamSchema, "params"),
  productController.deleteProduct,
);

// ── Orders ────────────────────────────────────────────────────────────────────
const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
});
const orderIdParamSchema = z.object({ id: z.string().uuid() });

router.get(
  "/orders",
  validate(orderQuerySchema, "query"),
  orderController.listOrders,
);
router.get(
  "/orders/:id",
  validate(orderIdParamSchema, "params"),
  orderController.getOrder,
);
router.post(
  "/orders/:id/process",
  validate(orderIdParamSchema, "params"),
  orderController.processOrder,
);
router.get("/reports/income", orderController.getIncomeReport);

export default router;
