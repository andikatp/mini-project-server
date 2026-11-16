import { Router } from "express";
import {
  cancelCustomerTransactionHandler,
  createTransactionHandler,
  getCustomerTransactionsHandler,
  getTransactionDetailHandler,
  uploadPaymentProofHandler,
} from "../controllers/transaction.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole, UserRole } from "../middlewares/auth.middleware";
import { uploadSingleImage } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createTransactionSchema,
  transactionIdParamSchema,
} from "../validations/transaction.validation";

const router = Router();

router.use(asyncHandler(requireAuth));

// Customer transactions

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new ticket transaction / order
 *     tags: [Transactions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, ticketTypeId, quantity]
 *             properties:
 *               eventId:
 *                 type: string
 *               ticketTypeId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               voucherCode:
 *                 type: string
 *               couponCode:
 *                 type: string
 *               pointsToUse:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Validation error or insufficient tickets/points
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  requireRole(UserRole.CUSTOMER),
  validate({ body: createTransactionSchema }),
  asyncHandler(createTransactionHandler),
);

/**
 * @swagger
 * /transactions/me:
 *   get:
 *     summary: Get list of transactions belonging to current logged-in customer
 *     tags: [Transactions]
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
 *         description: List of customer transactions
 *       401:
 *         description: Unauthorized
 */
router.get("/me", requireRole(UserRole.CUSTOMER), asyncHandler(getCustomerTransactionsHandler));

/**
 * @swagger
 * /transactions/{transactionId}:
 *   get:
 *     summary: Get transaction details by ID
 *     tags: [Transactions]
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
 *         description: Transaction detail
 *       404:
 *         description: Transaction not found
 */
router.get(
  "/:transactionId",
  validate({ params: transactionIdParamSchema }),
  asyncHandler(getTransactionDetailHandler),
);

/**
 * @swagger
 * /transactions/{transactionId}/payment-proof:
 *   post:
 *     summary: Upload payment proof image (Max 1MB: JPEG, PNG, WebP)
 *     tags: [Transactions]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Payment proof uploaded successfully
 *       400:
 *         description: Invalid file or transaction not in WAITING_FOR_PAYMENT status
 */
router.post(
  "/:transactionId/payment-proof",
  requireRole(UserRole.CUSTOMER),
  validate({ params: transactionIdParamSchema }),
  uploadSingleImage,
  asyncHandler(uploadPaymentProofHandler),
);

/**
 * @swagger
 * /transactions/{transactionId}/cancel:
 *   post:
 *     summary: Cancel a pending transaction
 *     tags: [Transactions]
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
 *         description: Transaction canceled and points/seats refunded
 *       400:
 *         description: Transaction cannot be canceled
 */
router.post(
  "/:transactionId/cancel",
  requireRole(UserRole.CUSTOMER),
  validate({ params: transactionIdParamSchema }),
  asyncHandler(cancelCustomerTransactionHandler),
);

export default router;

