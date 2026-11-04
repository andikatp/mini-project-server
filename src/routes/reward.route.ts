import { Router } from "express";
import {
  getMyCouponsHandler,
  getMyPointsHandler,
  validateCouponHandler,
} from "../controllers/reward.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  paginationQuerySchema,
  validateCouponParamsSchema,
} from "../validations/reward.validation";

const router = Router();

// Only authenticated customers can access customer reward endpoints
router.use(requireAuth, requireRole("CUSTOMER"));

/**
 * @swagger
 * /rewards/points:
 *   get:
 *     summary: Get active points balance & expiration history for the logged-in user
 *     tags: [Rewards]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Points balance fetched successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden (Customers only)
 */
router.get(
  "/points",
  validate({ query: paginationQuerySchema }),
  asyncHandler(getMyPointsHandler),
);

/**
 * @swagger
 * /rewards/coupons:
 *   get:
 *     summary: Get list of system coupons belonging to the logged-in user
 *     tags: [Rewards]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: User coupons list fetched successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden (Customers only)
 */
router.get(
  "/coupons",
  validate({ query: paginationQuerySchema }),
  asyncHandler(getMyCouponsHandler),
);

/**
 * @swagger
 * /rewards/coupons/{code}/validate:
 *   get:
 *     summary: Check if a user's coupon is valid for use
 *     tags: [Rewards]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon is valid
 *       400:
 *         description: Coupon is expired or already redeemed
 *       404:
 *         description: Coupon not found
 */
router.get(
  "/coupons/:code/validate",
  validate({ params: validateCouponParamsSchema }),
  asyncHandler(validateCouponHandler),
);

export default router;

