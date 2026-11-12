const isProduction =
  process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";

if (isProduction && !process.env.SESSION_SECRET) {
  console.warn(
    "[SECURITY WARNING] SESSION_SECRET is not set in production! Please define SESSION_SECRET in environment variables.",
  );
}

export const SESSION_CONFIG = {
  cookieName: "sessionId",
  secret: process.env.SESSION_SECRET || "fallback-insecure-session-secret-key",
  expiresInDays: 7,
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
} as const;
