import type { NextFunction, Request, Response } from "express";
import { SESSION_CONFIG } from "../configs/session.config.ts";
import { AuthenticationError, ForbiddenError } from "../errors";
import { validateSessionService } from "../services/auth.service";

// Extend Express Request type to include user & session
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: "CUSTOMER" | "EVENT_ORGANIZER";
        avatarUrl: string | null;
        referralCode: string;
        emailVerifiedAt: Date | null;
      };
      sessionId?: string;
    }
  }
}

/**
 * Middleware that authenticates incoming requests using the HttpOnly session cookie.
 * Attaches authenticated user to `req.user`.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const sessionToken = req.cookies?.[SESSION_CONFIG.cookieName];

  if (!sessionToken) {
    throw new AuthenticationError("Authentication required. Please log in.");
  }

  const sessionData = await validateSessionService(sessionToken);

  if (!sessionData) {
    throw new AuthenticationError(
      "Invalid or expired session. Please log in again.",
    );
  }

  req.user = sessionData.user;
  req.sessionId = sessionData.session.id;

  next();
}

/**
 * Middleware that restricts access to specific user roles (e.g., EVENT_ORGANIZER).
 * Must be placed after `requireAuth`.
 */
export function requireRole(...allowedRoles: Array<"CUSTOMER" | "EVENT_ORGANIZER">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError("Authentication required.");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        "Forbidden. You do not have permission to access this resource.",
      );
    }

    next();
  };
}
