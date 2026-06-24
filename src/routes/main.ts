import { Router } from "express";
import authRoutes from "./auth.js";
import reviewRoutes from "./review.js";
import profileRoutes from "./profile.js";
import sellerRoutes from "./seller.js";
import buyerRoutes from "./buyer.js";
import driverRoutes from "./driver.js";
import publicRoutes from "./public.js";
import adminRoutes from "./admin.js";
import { authenticate } from "../middlewares/authenticate.js";
import * as authController from "../controllers/auth.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));

router.use("/auth", authRoutes);
router.use("/reviews", reviewRoutes);
router.use("/profile", profileRoutes);
router.use("/seller", sellerRoutes);
router.use("/buyer", buyerRoutes);
router.use("/driver", driverRoutes);
router.use("/catalog", publicRoutes);
router.use("/admin", adminRoutes);

router.get("/me/summary", authenticate(), authController.summary);

export default router;
