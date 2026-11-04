import { Router } from "express";
import {
  getMeHandler,
  updateMeHandler,
} from "../controllers/user.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { updateProfileSchema } from "../validations/user.validation";

const router = Router();

// GET /api/v1/users/me
/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully fetched current user profile
 *       401:
 *         description: Not authenticated
 */
router.get("/me", requireAuth, asyncHandler(getMeHandler));

// PATCH /api/v1/users/me
/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update current authenticated user profile
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.patch(
  "/me",
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(updateMeHandler),
);

export default router;
