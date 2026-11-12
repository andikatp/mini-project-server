import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../errors";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Origin-based CSRF protection middleware.
 *
 * When session cookies use SameSite=None (necessary for cross-site deployments
 * such as frontend on Vercel and backend on Render), browsers send cookies on
 * cross-site requests.
 *
 * This middleware validates that state-changing requests (POST, PUT, PATCH, DELETE)
 * originate from trusted frontend domains (CLIENT_ORIGIN / allowedOrigins).
 *
 * If an untrusted third-party site (e.g. evil.com) attempts a cross-site form submission
 * or cross-origin fetch, the request is immediately rejected with 403 Forbidden before
 * any handler or file upload executes.
 */
export function createCsrfProtection(allowedOrigins: Set<string>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Only inspect state-changing mutation methods
    if (!MUTATION_METHODS.has(req.method)) {
      return next();
    }

    // Skip in automated test environment
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const origin = req.headers.origin;

    // Browser cross-origin requests and fetch/XHR include the Origin header
    if (origin) {
      if (!allowedOrigins.has(origin)) {
        throw new ForbiddenError(
          `Cross-Site Request Forgery (CSRF) blocked: untrusted origin '${origin}'.`,
        );
      }
      return next();
    }

    // If Origin is not present (e.g. standard HTML form POST navigation), verify Referer
    const referer = req.headers.referer;
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (!allowedOrigins.has(refererOrigin)) {
          throw new ForbiddenError(
            `Cross-Site Request Forgery (CSRF) blocked: untrusted referer origin '${refererOrigin}'.`,
          );
        }
      } catch {
        throw new ForbiddenError("Malformed Referer header in state-changing request.");
      }
    }

    next();
  };
}
