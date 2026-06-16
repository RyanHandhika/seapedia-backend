import { Router } from "express";
import authControllers from "../controllers/auth.js";

const router = Router();

router.post("/register", authControllers.register);
router.post("/login", authControllers.login);
router.get("/me", authControllers.getMe);
// router.post("/active-role", authControllers.activeRole);

export default router;
