import { Router } from "express";
import {
  getCustomerReviewsHandler,
  getOrganizerReviewsHandler,
  updateReviewStatusHandler,
} from "../controllers/review.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole, UserRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  organizerIdParamSchema,
  reviewIdParamSchema,
  updateReviewStatusSchema,
} from "../validations/review.validation";

const router = Router();

// Customer reviews

/**
 * @swagger
 * /reviews/me:
 *   get:
 *     summary: Get reviews submitted by the logged-in customer
 *     tags: [Reviews]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of user reviews
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/me",
  asyncHandler(requireAuth),
  requireRole(UserRole.CUSTOMER),
  asyncHandler(getCustomerReviewsHandler),
);

// Public route to view reviews of an organizer

/**
 * @swagger
 * /reviews/organizers/{organizerId}/reviews:
 *   get:
 *     summary: Get all approved reviews for a specific organizer
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: organizerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of organizer reviews with ratings and feedback
 */
router.get(
  "/organizers/:organizerId/reviews",
  validate({ params: organizerIdParamSchema }),
  asyncHandler(getOrganizerReviewsHandler),
);

// Organizer moderation of a review

/**
 * @swagger
 * /reviews/reviews/{reviewId}:
 *   patch:
 *     summary: Update review status / moderate review (Organizer only)
 *     tags: [Reviews]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, HIDDEN]
 *     responses:
 *       200:
 *         description: Review status updated
 *       403:
 *         description: Forbidden (Not the event organizer)
 */
router.patch(
  "/reviews/:reviewId",
  asyncHandler(requireAuth),
  requireRole(UserRole.EVENT_ORGANIZER),
  validate({ params: reviewIdParamSchema, body: updateReviewStatusSchema }),
  asyncHandler(updateReviewStatusHandler),
);

export default router;

