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
import { requireAuth, requireRole, UserRole } from "../middlewares/auth.middleware";
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
router.use(requireRole(UserRole.EVENT_ORGANIZER));

// Organizer events CRUD & lifecycle

/**
 * @swagger
 * /organizer/events:
 *   get:
 *     summary: List events created by the logged-in organizer
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of organizer events
 *   post:
 *     summary: Create a new event draft
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category, location, startDate, endDate]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               location:
 *                 type: string
 *               bannerUrl:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Event created successfully
 */
router.get("/events", asyncHandler(getOrganizerEventsHandler));
router.post("/events", validate({ body: createEventSchema }), asyncHandler(createOrganizerEventHandler));

/**
 * @swagger
 * /organizer/events/{eventId}:
 *   patch:
 *     summary: Update an existing event
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event updated
 */
router.patch("/events/:eventId", validate({ params: eventIdParamSchema, body: updateEventSchema }), asyncHandler(updateOrganizerEventHandler));

/**
 * @swagger
 * /organizer/events/{eventId}/publish:
 *   post:
 *     summary: Publish an event (Make it public)
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event published
 */
router.post("/events/:eventId/publish", validate({ params: eventIdParamSchema }), asyncHandler(publishOrganizerEventHandler));

/**
 * @swagger
 * /organizer/events/{eventId}/cancel:
 *   post:
 *     summary: Cancel an event
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event canceled
 */
router.post("/events/:eventId/cancel", validate({ params: eventIdParamSchema }), asyncHandler(cancelOrganizerEventHandler));

// Ticket types

/**
 * @swagger
 * /organizer/events/{eventId}/ticket-types:
 *   post:
 *     summary: Create a ticket tier for an event
 *     tags: [Organizer]
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
 *             required: [name, price, totalSeats]
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: integer
 *               totalSeats:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Ticket tier created
 */
router.post(
  "/events/:eventId/ticket-types",
  validate({ params: eventIdParamSchema, body: createTicketTypeSchema }),
  asyncHandler(createTicketTypeHandler),
);

/**
 * @swagger
 * /organizer/ticket-types/{ticketTypeId}:
 *   patch:
 *     summary: Update ticket tier details or seat quota
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketTypeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket tier updated
 */
router.patch(
  "/ticket-types/:ticketTypeId",
  validate({ params: ticketTypeIdParamSchema, body: updateTicketTypeSchema }),
  asyncHandler(updateTicketTypeHandler),
);

// Event vouchers

/**
 * @swagger
 * /organizer/events/{eventId}/vouchers:
 *   get:
 *     summary: Get vouchers created for an event
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of event vouchers
 *   post:
 *     summary: Create a voucher code for an event
 *     tags: [Organizer]
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
 *             required: [code, discountPercent, maxUsage, expiresAt]
 *             properties:
 *               code:
 *                 type: string
 *               discountPercent:
 *                 type: integer
 *               maxUsage:
 *                 type: integer
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Voucher created
 */
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

/**
 * @swagger
 * /organizer/vouchers/{voucherId}:
 *   patch:
 *     summary: Update an event voucher
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: voucherId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Voucher updated
 */
router.patch(
  "/vouchers/:voucherId",
  validate({ params: voucherIdParamSchema, body: updateEventVoucherSchema }),
  asyncHandler(updateEventVoucherHandler),
);

// Dashboard & stats

/**
 * @swagger
 * /organizer/dashboard/summary:
 *   get:
 *     summary: Get organizer summary metrics (Total Revenue, Active Events, Total Tickets Sold)
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Summary analytics
 */
router.get("/dashboard/summary", asyncHandler(getDashboardSummaryHandler));

/**
 * @swagger
 * /organizer/dashboard/timeseries:
 *   get:
 *     summary: Get revenue and ticket sales time-series analytics (daily, weekly, monthly, yearly)
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *     responses:
 *       200:
 *         description: Timeseries data
 */
router.get(
  "/dashboard/timeseries",
  validate({ query: dashboardTimeseriesQuerySchema }),
  asyncHandler(getDashboardTimeseriesHandler),
);

/**
 * @swagger
 * /organizer/events/{eventId}/attendees:
 *   get:
 *     summary: List attendees who purchased tickets for an event
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendees list
 */
router.get(
  "/events/:eventId/attendees",
  validate({ params: eventIdParamSchema, query: eventAttendeesQuerySchema }),
  asyncHandler(getEventAttendeesHandler),
);

/**
 * @swagger
 * /organizer/transactions:
 *   get:
 *     summary: List customer transactions for organizer's events (for proof verification)
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [WAITING_FOR_PAYMENT, WAITING_FOR_ADMIN_CONFIRMATION, DONE, REJECTED, EXPIRED, CANCELED]
 *     responses:
 *       200:
 *         description: List of transactions with payment proofs
 */
router.get(
  "/transactions",
  validate({ query: organizerTransactionsQuerySchema }),
  asyncHandler(getOrganizerTransactionsHandler),
);

/**
 * @swagger
 * /organizer/transactions/{transactionId}/accept:
 *   post:
 *     summary: Accept payment proof and finalize order (Issues tickets & points)
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction accepted successfully
 */
router.post(
  "/transactions/:transactionId/accept",
  validate({ params: transactionIdParamSchema }),
  asyncHandler(acceptTransactionHandler),
);

/**
 * @swagger
 * /organizer/transactions/{transactionId}/reject:
 *   post:
 *     summary: Reject invalid payment proof
 *     tags: [Organizer]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction payment proof rejected
 */
router.post(
  "/transactions/:transactionId/reject",
  validate({ params: transactionIdParamSchema, body: rejectProofBodySchema }),
  asyncHandler(rejectTransactionHandler),
);

export default router;


