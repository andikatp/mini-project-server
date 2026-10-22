import { Router } from "express";
import { getMeHandler } from "../controllers/user.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/auth.middleware";

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

export default router;
