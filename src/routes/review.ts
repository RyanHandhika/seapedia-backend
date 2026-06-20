import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { reviewLimiter } from "../middlewares/rateLimiter.js";
import {
  submitReviewSchema,
  listReviewsQuerySchema,
} from "../validators/review.js";
import * as reviewController from "../controllers/review.js";

const router = Router();

// Guests AND logged-in users may submit reviews — authenticate() runs in
// "optional" mode so req.user is attached only if a valid token is present.
router.post(
  "/",
  reviewLimiter,
  authenticate({ optional: true }),
  validate(submitReviewSchema),
  reviewController.submit,
);

router.get(
  "/",
  validate(listReviewsQuerySchema, "query"),
  reviewController.list,
);

export default router;
