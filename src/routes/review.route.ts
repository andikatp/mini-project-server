import { Router } from "express";
import {
  getOrganizerReviewsHandler,
  updateReviewStatusHandler,
} from "../controllers/review.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  organizerIdParamSchema,
  reviewIdParamSchema,
  updateReviewStatusSchema,
} from "../validations/review.validation";

const router = Router();

// Public route to view reviews of an organizer
router.get(
  "/organizers/:organizerId/reviews",
  validate({ params: organizerIdParamSchema }),
  asyncHandler(getOrganizerReviewsHandler),
);

// Organizer moderation of a review
router.patch(
  "/reviews/:reviewId",
  asyncHandler(requireAuth),
  requireRole("EVENT_ORGANIZER"),
  validate({ params: reviewIdParamSchema, body: updateReviewStatusSchema }),
  asyncHandler(updateReviewStatusHandler),
);

export default router;
