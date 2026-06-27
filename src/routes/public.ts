import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import {
  listProductsQuerySchema,
  productIdParamSchema,
} from "../validators/products.js";
import { storeIdParamSchema } from "../validators/store.js";
import * as catalogController from "../controllers/catalog.js";

const router = Router();

// Public — no authenticate() middleware on any of these routes.
// Guests can browse without a token.

router.get(
  "/products",
  validate(listProductsQuerySchema, "query"),
  catalogController.listProducts,
);

router.get(
  "/products/:id",
  validate(productIdParamSchema, "params"),
  catalogController.getProduct,
);

router.get(
  "/stores/:id",
  validate(storeIdParamSchema, "params"),
  catalogController.getStore,
);

export default router;
