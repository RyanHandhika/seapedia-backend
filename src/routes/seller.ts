import { Router } from "express";
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

const router = Router();

// Every seller route requires an authenticated user with activeRole = SELLER.
// This is enforced server-side — the frontend cannot bypass it.
router.use(authenticate(), requireRole("SELLER"));

// ── Store ────────────────────────────────────────────────────────────────────
router.get("/store", storeController.getMyStore);
router.put(
  "/store",
  validate(updateStoreSchema),
  storeController.updateMyStore,
);

// ── Products ─────────────────────────────────────────────────────────────────
// parseImage runs multer FIRST (processes the multipart body into req.file +
// req.body), THEN validate() checks the text fields from req.body.
// Order matters: validate before parseImage would see an empty req.body.
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

export default router;
