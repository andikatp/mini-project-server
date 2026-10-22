export const SESSION_CONFIG = {
  cookieName: "sessionId",
  secret: process.env.SESSION_SECRET || "fallback-insecure-session-secret-key",
  expiresInDays: 7,
  // 7 days in milliseconds
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
} as const;
