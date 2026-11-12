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
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
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
router.get("/", validate({ query: publicEventsQuerySchema }), asyncHandler(listPublicEventsHandler));
router.get("/categories", asyncHandler(listCategoriesHandler));
router.get(
  "/:eventId",
  validate({ params: publicEventParamSchema }),
  asyncHandler(getPublicEventDetailHandler),
);

// Event reviews
router.get(
  "/:eventId/reviews",
  validate({ params: eventReviewsParamSchema }),
  asyncHandler(getEventReviewsHandler),
);

router.post(
  "/:eventId/reviews",
  asyncHandler(requireAuth),
  requireRole("CUSTOMER"),
  validate({ params: eventReviewsParamSchema, body: createReviewSchema }),
  asyncHandler(createReviewHandler),
);

export default router;
