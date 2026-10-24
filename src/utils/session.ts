import { generateSecureToken, hashToken } from "./token.ts";

/**
 * Generate a cryptographically secure session token and its SHA-256 hash.
 * - The raw token is sent to the client via an HttpOnly cookie.
 * - Only the hash is stored in the database.
 */
export function generateSessionToken() {
  const { rawToken, tokenHash } = generateSecureToken();
  return { token: rawToken, tokenHash };
}

/**
 * Hash a raw session token using SHA-256 to look it up in the database.
 */
export function hashSessionToken(token: string): string {
  return hashToken(token);
}
