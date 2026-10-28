import { createHash, randomInt } from "node:crypto";

/**
 * Expiration duration for OTP codes: 10 minutes.
 */
export const OTP_EXPIRATION_MS = 10 * 60 * 1000;

/**
 * Maximum failed verification attempts before the OTP code is permanently invalidated.
 */
export const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 */
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

/**
 * Hash an OTP code using SHA-256 for secure storage at rest.
 */
export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

/**
 * Helper to generate a 6-digit OTP along with its SHA-256 hash and 10-minute expiry timestamp.
 */
export function generateOtpRecord() {
  const rawOtp = generateOtp();
  const codeHash = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

  return {
    rawOtp,
    codeHash,
    expiresAt,
  };
}

