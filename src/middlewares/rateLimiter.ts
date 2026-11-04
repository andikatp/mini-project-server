import rateLimit from "express-rate-limit";
import { sendError } from "../utils/response";

/**
 * Strict rate limiter for sensitive authentication endpoints
 * (login, register, forgot-password, verify OTP, resend OTP).
 * Skips in test environment so automated test suites run without throttle.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  limit: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: () => process.env.NODE_ENV === "test",
  handler: (_req, res) => {
    return sendError(
      res,
      429,
      "Too many requests from this IP. Please try again after 15 minutes.",
    );
  },
});

/**
 * General API rate limiter for standard traffic.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  handler: (_req, res) => {
    return sendError(
      res,
      429,
      "Too many requests. Please slow down.",
    );
  },
});
