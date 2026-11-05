const isProduction =
  process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";

export const SESSION_CONFIG = {
  cookieName: "sessionId",
  secret: process.env.SESSION_SECRET || "fallback-insecure-session-secret-key",
  expiresInDays: 7,
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
} as const;
