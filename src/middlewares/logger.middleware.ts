import type { NextFunction, Request, Response } from "express";
import { APP_CONFIG } from "../configs/app.config.ts";
import { logger } from "../libs/logger.ts";

/**
 * Filter out sensitive fields like passwords, tokens, or codes from logs.
 */
function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;

  const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };
  const sensitiveKeys = new Set([
    "password",
    "oldPassword",
    "newPassword",
    "token",
    "sessionToken",
    "secret",
    "resetToken",
  ]);

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.has(key)) {
      sanitized[key] = "***";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizePayload(sanitized[key]);
    }
  }

  return sanitized;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();
  const method = req.method;
  const url = req.originalUrl || req.url;

  if (method !== "GET" && req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = sanitizePayload(req.body);
    logger.info(`--> ${method} ${url} | body: ${JSON.stringify(sanitizedBody)}`);
  }
  let responseBody: any = null;
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    responseBody = body;
    return originalJson(body);
  };

  res.setHeader("X-App-Version", APP_CONFIG.version);

  res.on("finish", () => {
    const duration = (performance.now() - startTime).toFixed(1);
    const statusCode = res.statusCode;
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "-";
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;

    let detail = "";
    if (responseBody) {
      if (statusCode >= 400 && responseBody.message) {
        detail = ` | error: "${responseBody.message}"`;
      } else if (responseBody.status) {
        detail = ` | status: "${responseBody.status}"`;
      }
    }

    const logMessage = `<-- ${method} ${url} ${statusCode} - ${duration}ms${detail} [ip: ${ip}]`;

    if (statusCode >= 500) {
      logger.error(logMessage);
    } else if (statusCode >= 400) {
      logger.warn(logMessage);
    } else {
      logger.info(logMessage);
    }
  });

  next();
}
