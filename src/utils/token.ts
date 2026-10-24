import { createHash, randomBytes } from "crypto";

/**
 * Generate a cryptographically secure random token (32-byte hex)
 * and its SHA-256 hash.
 *
 * - The raw token is sent to the user (via email link).
 * - The SHA-256 hash is safely stored in the database.
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

/**
 * Generate an email verification token with a 24-hour expiration.
 */
export function generateVerificationToken() {
  const { rawToken, tokenHash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { rawToken, tokenHash, expiresAt };
}

/**
 * Generate a password reset token with a 1-hour expiration.
 */
export function generatePasswordResetToken() {
  const { rawToken, tokenHash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { rawToken, tokenHash, expiresAt };
}
