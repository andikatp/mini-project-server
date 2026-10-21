import type { Response } from "express";

type SuccessPayload<T> = {
  status: "success";
  message: string;
  data: T;
};

type ErrorPayload = {
  status: "error";
  message: string;
};

/**
 * Send a JSON success response.
 */
export function sendSuccess<T>(res: Response, statusCode: number, message: string, data: T) {
  const payload: SuccessPayload<T> = { status: "success", message, data };
  return res.status(statusCode).json(payload);
}

/**
 * Send a JSON error response.
 */
export function sendError(res: Response, statusCode: number, message: string) {
  const payload: ErrorPayload = { status: "error", message };
  return res.status(statusCode).json(payload);
}
