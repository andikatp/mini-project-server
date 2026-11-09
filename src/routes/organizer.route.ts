import { Router } from "express";
import {
  acceptTransactionHandler,
  getDashboardSummaryHandler,
  getDashboardTimeseriesHandler,
  getEventAttendeesHandler,
  getOrganizerTransactionsHandler,
  rejectTransactionHandler,
} from "../controllers/organizer.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  dashboardTimeseriesQuerySchema,
  eventAttendeesQuerySchema,
  eventIdParamSchema,
  rejectProofBodySchema,
  transactionIdParamSchema,
} from "../validations/organizer.validation";

const router = Router();

router.use(asyncHandler(requireAuth));
router.use(requireRole("EVENT_ORGANIZER"));

router.get("/dashboard/summary", asyncHandler(getDashboardSummaryHandler));

router.get(
  "/dashboard/timeseries",
  validate({ query: dashboardTimeseriesQuerySchema }),
  asyncHandler(getDashboardTimeseriesHandler),
);

router.get(
  "/events/:eventId/attendees",
  validate({ params: eventIdParamSchema, query: eventAttendeesQuerySchema }),
  asyncHandler(getEventAttendeesHandler),
);

router.get("/transactions", asyncHandler(getOrganizerTransactionsHandler));

router.post(
  "/transactions/:transactionId/accept",
  validate({ params: transactionIdParamSchema }),
  asyncHandler(acceptTransactionHandler),
);

router.post(
  "/transactions/:transactionId/reject",
  validate({ params: transactionIdParamSchema, body: rejectProofBodySchema }),
  asyncHandler(rejectTransactionHandler),
);

export default router;

