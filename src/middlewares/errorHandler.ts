import type { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import { AppError } from "../errors";

/**
 * Centralized Express error handling middleware.
 * - AppError subclasses (AuthenticationError, TokenError, ConflictError, etc.) → uses their statusCode
 * - Fallback → 500
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message);
  }

  console.error(err);
  return sendError(res, 500, err.message ?? "Internal server error");
}
