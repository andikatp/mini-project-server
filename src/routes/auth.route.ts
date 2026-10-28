import { Router } from "express";
import {
  forgotPasswordHandler,
  getMeHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  resendVerificationHandler,
  resetPasswordHandler,
  verifyEmailHandler,
  verifyResetPasswordHandler,
} from "../controllers/auth.controller";
import { asyncHandler } from "../middlewares/asyncHandler.ts";
import { requireAuth } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validate.middleware.ts";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyResetPasswordSchema,
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
 *         description: Registration successful. Verification code sent.
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
 *     summary: Verify email address with 6-digit OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email successfully verified
 *       400:
 *         description: Invalid, expired, or locked verification code
 */
router.post(
  "/verify-email",
  validate({ body: verifyEmailSchema }),
  asyncHandler(verifyEmailHandler),
);

// POST /api/auth/resend-verification
/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend a fresh 6-digit verification code to email
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
 *         description: Verification code sent
 *       400:
 *         description: Validation error or email already verified
 */
router.post(
  "/resend-verification",
  validate({ body: resendVerificationSchema }),
  asyncHandler(resendVerificationHandler),
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
 *     summary: Request password reset 6-digit OTP code via email
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
 *         description: Password reset code dispatched if email exists
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

// POST /api/auth/verify-reset-password
/**
 * @swagger
 * /auth/verify-reset-password:
 *   post:
 *     summary: Verify 6-digit OTP code for password reset and receive one-time reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Reset code verified successfully; returns one-time reset token
 *       400:
 *         description: Invalid, expired, or locked reset code
 */
router.post(
  "/verify-reset-password",
  validate({ body: verifyResetPasswordSchema }),
  asyncHandler(verifyResetPasswordHandler),
);

// POST /api/auth/reset-password
/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset user password using one-time reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, password]
 *             properties:
 *               resetToken:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token, or invalid password
 */
router.post(
  "/reset-password",
  validate({ body: resetPasswordSchema }),
  asyncHandler(resetPasswordHandler),
);

export default router;
