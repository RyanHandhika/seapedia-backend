import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import {
  becomeSellerSchema,
  becomeDriverSchema,
} from "../validators/profile.js";
import * as profileController from "../controllers/profile.js";

const router = Router();

// All profile actions require a logged-in user (any role).
router.use(authenticate());

// GET /profile/roles — shows all roles the user currently owns.
// Useful for the frontend to know whether to show "Open Store" or
// "Go to Store Dashboard", etc.
router.get("/roles", profileController.myRoles);

// POST /profile/become-seller
// The user is on their profile page and taps "Open Store" (like Tokopedia's
// "Buka Toko"). We ask for a store name, grant SELLER role, and create the
// Store stub — all in one transaction.
router.post(
  "/become-seller",
  validate(becomeSellerSchema),
  profileController.becomeSeller,
);

// POST /profile/become-driver
// The user taps "Join as Driver". No extra fields needed at this level.
router.post(
  "/become-driver",
  validate(becomeDriverSchema),
  profileController.becomeDriver,
);

export default router;
