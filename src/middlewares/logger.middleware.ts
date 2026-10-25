import type { NextFunction, Request, Response } from "express";
import { APP_CONFIG } from "../configs/app.config.ts";
import { logger } from "../libs/logger.ts";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();

  // Expose version in response header for client inspection
  res.setHeader("X-App-Version", APP_CONFIG.version);

  res.on("finish", () => {
    const duration = (performance.now() - startTime).toFixed(1);
    const method = req.method;
    const url = req.originalUrl || req.url;
    const statusCode = res.statusCode;
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "-";
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;

    const logMessage = `${method} ${url} ${statusCode} - ${duration}ms [ip: ${ip}]`;

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
