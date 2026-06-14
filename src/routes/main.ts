import { Router } from "express";
import authRoutes from "./auth.js";

const router = Router();

// Authentication Routes
router.use("/auth", authRoutes);

export default router;
