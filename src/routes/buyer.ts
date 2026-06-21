import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validate } from "../middlewares/validate.js";
import { topupSchema, walletTxQuerySchema } from "../validators/wallet.js";
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from "../validators/address.js";
import {
  addToCartSchema,
  updateCartItemSchema,
  cartProductIdParamSchema,
} from "../validators/cart.js";
import { checkoutSchema } from "../validators/checkout.js";
import * as walletController from "../controllers/wallet.js";
import * as addressController from "../controllers/address.js";
import * as cartController from "../controllers/cart.js";
import * as checkoutController from "../controllers/checkout.js";

const router = Router();
router.use(authenticate(), requireRole("BUYER"));

// ── Wallet ───────────────────────────────────────────────────────────────────
router.get("/wallet", walletController.getBalance);
router.post("/wallet/topup", validate(topupSchema), walletController.topup);
router.get(
  "/wallet/transactions",
  validate(walletTxQuerySchema, "query"),
  walletController.listTransactions,
);

// ── Addresses ─────────────────────────────────────────────────────────────────
router.get("/addresses", addressController.list);
router.post(
  "/addresses",
  validate(createAddressSchema),
  addressController.create,
);
router.put(
  "/addresses/:id",
  validate(addressIdParamSchema, "params"),
  validate(updateAddressSchema),
  addressController.update,
);
router.delete(
  "/addresses/:id",
  validate(addressIdParamSchema, "params"),
  addressController.remove,
);

// ── Cart ──────────────────────────────────────────────────────────────────────
router.get("/cart", cartController.getCart);
router.post("/cart/items", validate(addToCartSchema), cartController.addItem);
router.put(
  "/cart/items/:productId",
  validate(cartProductIdParamSchema, "params"),
  validate(updateCartItemSchema),
  cartController.updateItem,
);
router.delete(
  "/cart/items/:productId",
  validate(cartProductIdParamSchema, "params"),
  cartController.removeItem,
);
router.delete("/cart", cartController.clearCart);

// ── Checkout & Orders ─────────────────────────────────────────────────────────
router.post(
  "/checkout/preview",
  validate(checkoutSchema),
  checkoutController.preview,
);
router.post("/checkout", validate(checkoutSchema), checkoutController.confirm);

const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
});
const orderIdParamSchema = z.object({ id: z.string().uuid() });

router.get(
  "/orders",
  validate(orderQuerySchema, "query"),
  checkoutController.listOrders,
);
router.get(
  "/orders/:id",
  validate(orderIdParamSchema, "params"),
  checkoutController.getOrder,
);
router.get("/reports/spending", checkoutController.getSpendingReport);

export default router;
