import { Router } from "express";
import authRoutes from "./auth.js";
import reviewRoutes from "./review.js";
import profileRoutes from "./profile.js";
import sellerRoutes from "./seller.js";
import publicRoutes from "./public.js";
import { authenticate } from "../middlewares/authenticate.js";
import * as authController from "../controllers/auth.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));

router.use("/auth", authRoutes);
router.use("/reviews", reviewRoutes);
router.use("/profile", profileRoutes);
router.use("/seller", sellerRoutes);
router.use("/catalog", publicRoutes);

router.get("/me/summary", authenticate(), authController.summary);

export default router;
