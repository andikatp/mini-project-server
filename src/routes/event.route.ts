import { Router } from "express";
import {
  getPublicEventDetailHandler,
  listCategoriesHandler,
  listPublicEventsHandler,
} from "../controllers/event.controller";
import {
  createReviewHandler,
  getEventReviewsHandler,
} from "../controllers/review.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole, UserRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  publicEventParamSchema,
  publicEventsQuerySchema,
} from "../validations/event.validation";
import {
  createReviewSchema,
  eventReviewsParamSchema,
} from "../validations/review.validation";

const router = Router();

// Public discovery

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List public events with search, filtering, and pagination
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title, description, or location
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: isFree
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [startDate, price, createdAt]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated list of events
 */
router.get("/", validate({ query: publicEventsQuerySchema }), asyncHandler(listPublicEventsHandler));

/**
 * @swagger
 * /events/categories:
 *   get:
 *     summary: List all event categories
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of categories with event counts
 */
router.get("/categories", asyncHandler(listCategoriesHandler));

/**
 * @swagger
 * /events/{eventId}:
 *   get:
 *     summary: Get public event details by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event detail including tickets and organizer
 *       404:
 *         description: Event not found
 */
router.get(
  "/:eventId",
  validate({ params: publicEventParamSchema }),
  asyncHandler(getPublicEventDetailHandler),
);

// Event reviews

/**
 * @swagger
 * /events/{eventId}/reviews:
 *   get:
 *     summary: Get reviews for a specific event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of approved reviews for the event
 */
router.get(
  "/:eventId/reviews",
  validate({ params: eventReviewsParamSchema }),
  asyncHandler(getEventReviewsHandler),
);

/**
 * @swagger
 * /events/{eventId}/reviews:
 *   post:
 *     summary: Submit a review and rating for an event (Customer only, attended attendees)
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Validation error or event not yet ended
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a customer or haven't attended)
 */
router.post(
  "/:eventId/reviews",
  asyncHandler(requireAuth),
  requireRole(UserRole.CUSTOMER),
  validate({ params: eventReviewsParamSchema, body: createReviewSchema }),
  asyncHandler(createReviewHandler),
);

export default router;
