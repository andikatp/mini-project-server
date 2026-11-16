import { Router } from "express";
import { previewCheckoutHandler } from "../controllers/transaction.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole, UserRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { checkoutPreviewSchema } from "../validations/transaction.validation";

const router = Router();

router.use(asyncHandler(requireAuth));
router.use(requireRole(UserRole.CUSTOMER));

/**
 * @swagger
 * /checkout/preview:
 *   post:
 *     summary: Preview ticket order pricing with discounts, coupons, and points breakdown
 *     tags: [Checkout]
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
 *       200:
 *         description: Price calculation breakdown (original price, discounts, final total)
 *       400:
 *         description: Invalid coupon, voucher, points, or insufficient tickets
 */
router.post("/preview", validate({ body: checkoutPreviewSchema }), asyncHandler(previewCheckoutHandler));

export default router;

