import { Router } from "express";
import {
  cancelOrganizerEventHandler,
  createEventVoucherHandler,
  createOrganizerEventHandler,
  createTicketTypeHandler,
  getEventVouchersHandler,
  publishOrganizerEventHandler,
  updateEventVoucherHandler,
  updateOrganizerEventHandler,
  updateTicketTypeHandler,
} from "../controllers/event.controller";
import {
  acceptTransactionHandler,
  getDashboardSummaryHandler,
  getDashboardTimeseriesHandler,
  getEventAttendeesHandler,
  getOrganizerTransactionsHandler,
  rejectTransactionHandler,
  getOrganizerEventsHandler,
} from "../controllers/organizer.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createEventSchema,
  createEventVoucherSchema,
  createTicketTypeSchema,
  eventIdParamSchema,
  ticketTypeIdParamSchema,
  updateEventSchema,
  updateEventVoucherSchema,
  updateTicketTypeSchema,
  voucherIdParamSchema,
} from "../validations/event.validation";
import {
  dashboardTimeseriesQuerySchema,
  eventAttendeesQuerySchema,
  organizerTransactionsQuerySchema,
  rejectProofBodySchema,
  transactionIdParamSchema,
} from "../validations/organizer.validation";

const router = Router();

router.use(asyncHandler(requireAuth));
router.use(requireRole("EVENT_ORGANIZER"));

// Organizer events CRUD & lifecycle
router.get("/events", asyncHandler(getOrganizerEventsHandler));
router.post("/events", validate({ body: createEventSchema }), asyncHandler(createOrganizerEventHandler));
router.patch("/events/:eventId", validate({ params: eventIdParamSchema, body: updateEventSchema }), asyncHandler(updateOrganizerEventHandler));
router.post("/events/:eventId/publish", validate({ params: eventIdParamSchema }), asyncHandler(publishOrganizerEventHandler));
router.post("/events/:eventId/cancel", validate({ params: eventIdParamSchema }), asyncHandler(cancelOrganizerEventHandler));

// Ticket types
router.post(
  "/events/:eventId/ticket-types",
  validate({ params: eventIdParamSchema, body: createTicketTypeSchema }),
  asyncHandler(createTicketTypeHandler),
);
router.patch(
  "/ticket-types/:ticketTypeId",
  validate({ params: ticketTypeIdParamSchema, body: updateTicketTypeSchema }),
  asyncHandler(updateTicketTypeHandler),
);

// Event vouchers
router.get(
  "/events/:eventId/vouchers",
  validate({ params: eventIdParamSchema }),
  asyncHandler(getEventVouchersHandler),
);
router.post(
  "/events/:eventId/vouchers",
  validate({ params: eventIdParamSchema, body: createEventVoucherSchema }),
  asyncHandler(createEventVoucherHandler),
);
router.patch(
  "/vouchers/:voucherId",
  validate({ params: voucherIdParamSchema, body: updateEventVoucherSchema }),
  asyncHandler(updateEventVoucherHandler),
);

// Dashboard & stats
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

router.get(
  "/transactions",
  validate({ query: organizerTransactionsQuerySchema }),
  asyncHandler(getOrganizerTransactionsHandler),
);

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


