import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../errors";
import { logger } from "../libs/logger";
import { sendError } from "../utils/response";

/**
 * Centralized Express error handling middleware.
 * - body-parser SyntaxError (malformed JSON) → 400
 * - multer.MulterError → 400 with user-friendly message
 * - ZodError → 400 with formatted field errors
 * - AppError subclasses → uses their statusCode
 * - Fallback → 500
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Malformed JSON body (body-parser SyntaxError)
  if (err instanceof SyntaxError && err.message.includes("JSON")) {
    return sendError(res, 400, "Invalid JSON in request body");
  }

  // Handle Multer errors (file size limit, unexpected field, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(
        res,
        400,
        "File size is too large. Maximum allowed size is 1MB.",
      );
    }
    return sendError(res, 400, err.message);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const message = err.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join(", ");
    return sendError(res, 400, message || "Validation failed");
  }

  // Handle known application errors
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message);
  }

  // Log unexpected errors
  logger.error("Unhandled Server Error:", err);

  return sendError(res, 500, "Internal server error");
}


