import { createHash, randomBytes } from "node:crypto";

/**
 * Generate a cryptographically secure random token (32-byte hex)
 * and its SHA-256 hash.
 *
 * Used for session tokens and secure identifiers.
 */
export function generateSecureToken() {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Hash an incoming raw token using SHA-256 to query the database.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
