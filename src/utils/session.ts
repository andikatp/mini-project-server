import { randomBytes, createHash } from "crypto";

/**
 * Generate a cryptographically secure session token and its SHA-256 hash.
 * - The raw token is sent to the client via an HttpOnly cookie.
 * - Only the hash is stored in the database.
 */
export function generateSessionToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  return { token, tokenHash };
}

/**
 * Hash a raw session token using SHA-256 to look it up in the database.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
