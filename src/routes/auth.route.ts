import { Router } from "express";
import {
  forgotPasswordHandler,
  getMeHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "../controllers/auth.controller";
import { asyncHandler } from "../middlewares/asyncHandler.ts";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validations/auth.validation.ts";

const router = Router();

// POST /api/auth/register
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, EVENT_ORGANIZER]
 *               referralCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful. Verification email sent.
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post(
  "/register",
  validate({ body: registerSchema }),
  asyncHandler(registerHandler),
);

// POST /api/auth/verify-email
/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address with token from verification email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email successfully verified
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  "/verify-email",
  validate({ body: verifyEmailSchema }),
  asyncHandler(verifyEmailHandler),
);

// POST /api/auth/login
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, sets HttpOnly session cookie
 *       401:
 *         description: Invalid credentials or unverified email
 */
router.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(loginHandler),
);

// Fallback alias for backward compatibility: GET /api/v1/auth/me
router.get("/me", requireAuth, asyncHandler(getMeHandler));

// POST /api/auth/logout
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and clear session cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", asyncHandler(logoutHandler));

// POST /api/auth/forgot-password
/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link via email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset link dispatched if email exists
 */
router.post(
  "/forgot-password",
  validate({ body: forgotPasswordSchema }),
  asyncHandler(forgotPasswordHandler),
);
router.post(
  "/request-password-reset",
  validate({ body: forgotPasswordSchema }),
  asyncHandler(forgotPasswordHandler),
);

// POST /api/auth/reset-password
/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset user password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token, or invalid password
 */
router.post(
  "/reset-password",
  validate({ body: resetPasswordSchema }),
  asyncHandler(resetPasswordHandler),
);


export default router;
