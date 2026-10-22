import argon2 from "argon2";
import { createHash, randomBytes } from "crypto";
import { SESSION_CONFIG } from "../configs/session.config.ts";
import { prisma } from "../db";
import { AuthenticationError, ConflictError, ValidationError } from "../errors";
import { Prisma } from "../generated/prisma/client";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../libs/mailer.ts";
import { generateReferralCode } from "../utils/referral";
import { generateSessionToken, hashSessionToken } from "../utils/session";
import type { LoginInput, RegisterInput } from "../validations/auth.validation";

/**
 * Register a new user, create email verification token, send verification email,
 * and optionally grant referral rewards.
 */
export async function registerUserService(input: RegisterInput) {
  const { email, password, name, role, referralCode } = input;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError("Email is already registered");
  }

  const hashedPassword = await argon2.hash(password);

  let referrerId: string | null = null;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
    });

    if (!referrer) {
      throw new ValidationError("Invalid referral code");
    }
    referrerId = referrer.id;
  }

  let newReferralCode = generateReferralCode(name);
  let codeExists = await prisma.user.findUnique({
    where: { referralCode: newReferralCode },
  });
  while (codeExists) {
    newReferralCode = generateReferralCode(name);
    codeExists = await prisma.user.findUnique({
      where: { referralCode: newReferralCode },
    });
  }

  // Generate email verification token (raw to email, hash to DB)
  const rawVerificationToken = randomBytes(32).toString("hex");
  const verificationTokenHash = createHash("sha256")
    .update(rawVerificationToken)
    .digest("hex");
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          role,
          referralCode: newReferralCode,
          referredByUserId: referrerId,
        },
      });

      // Save email verification token
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: verificationTokenHash,
          expiresAt: verificationExpiresAt,
        },
      });

      if (referrerId) {
        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 3);

        // Give referrer 10,000 points
        await tx.pointCredit.create({
          data: {
            userId: referrerId,
            initialAmount: 10000,
            remainingAmount: 10000,
            issuedAt: now,
            expiresAt: expiresAt,
          },
        });

        // Give new user a welcome system coupon
        await tx.systemCoupon.create({
          data: {
            userId: user.id,
            code: `WELCOME-${randomBytes(3).toString("hex").toUpperCase()}`,
            status: "AVAILABLE",
            issuedAt: now,
            expiredAt: expiresAt,
          },
        });
      }

      return user;
    },
  );

  // Send verification email asynchronously
  await sendVerificationEmail(result.email, rawVerificationToken).catch(
    () => null,
  );

  const { passwordHash: _passwordHash, ...userWithoutPassword } = result;
  return userWithoutPassword;
}

/**
 * Verify a user's email address using the token sent to their inbox.
 */
export async function verifyEmailService(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const verificationRecord = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!verificationRecord) {
    throw new ValidationError("Invalid or expired verification token");
  }

  if (verificationRecord.usedAt) {
    throw new ValidationError("This verification token has already been used");
  }

  if (verificationRecord.expiresAt < new Date()) {
    throw new ValidationError(
      "Verification token has expired. Please request a new one.",
    );
  }

  // Atomically mark token as used and set user emailVerifiedAt
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: verificationRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: verificationRecord.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return { message: "Email successfully verified" };
}

/**
 * Authenticate a user and create a database session.
 * @param input Login credentials.
 * @returns Auth payload containing user (without password) and the raw session token.
 */
export async function loginUserService(input: LoginInput) {
  const { email, password } = input;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AuthenticationError("Invalid email or password");
  }

  const isPasswordValid = await argon2.verify(user.passwordHash, password);

  if (!isPasswordValid) {
    throw new AuthenticationError("Invalid email or password");
  }

  if (!user.emailVerifiedAt) {
    throw new AuthenticationError(
      "Please verify your email address before logging in. Check your inbox for the activation link.",
    );
  }

  const { token, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_CONFIG.maxAgeMs);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    sessionToken: token,
  };
}

export { getUserProfileService } from "./user.service";

/**
 * Validate a session token and return the associated user.
 * @param rawSessionToken The raw session token sent by client cookie.
 */
export async function validateSessionService(rawSessionToken: string) {
  const tokenHash = hashSessionToken(rawSessionToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check if session expired
  if (session.expiresAt < new Date()) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => null);
    return null;
  }

  const { passwordHash: _passwordHash, ...userWithoutPassword } = session.user;
  return { user: userWithoutPassword, session };
}

/**
 * Invalidate/delete a session (Logout).
 * @param rawSessionToken The raw session token to destroy.
 */
export async function logoutService(rawSessionToken: string) {
  const tokenHash = hashSessionToken(rawSessionToken);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

/**
 * Request a password reset for a given email address.
 * Generates a secure random token, hashes and stores it with an expiration timestamp,
 * and sends an email with the raw reset token.
 *
 * Silently returns if user is not found to prevent account enumeration.
 *
 * @param email The user's registered email address.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Guard against user enumeration: return silently if email not found
  if (!user) {
    return;
  }

  // Generate email reset token (raw token sent to email, SHA-256 hash stored in DB)
  const rawResetToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawResetToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

  // Invalidate any existing unused reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  });

  // Save the new password reset token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  // Send password reset email asynchronously
  await sendPasswordResetEmail(user.email, rawResetToken).catch(() => null);
}

/**
 * Complete the password reset process using the reset token and new password.
 * Atomically updates user's passwordHash, marks the reset token as used,
 * and invalidates all existing active sessions.
 *
 * @param rawToken The raw reset token from the reset link.
 * @param newPassword The new password provided by the user.
 */
export async function resetPasswordService(
  rawToken: string,
  newPassword: string,
) {
  if (!rawToken) {
    throw new ValidationError("Reset token is required");
  }

  if (!newPassword || newPassword.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long");
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetRecord) {
    throw new ValidationError("Invalid or expired password reset token");
  }

  if (resetRecord.usedAt) {
    throw new ValidationError(
      "This password reset token has already been used",
    );
  }

  if (resetRecord.expiresAt < new Date()) {
    throw new ValidationError(
      "Password reset token has expired. Please request a new one.",
    );
  }

  const hashedPassword = await argon2.hash(newPassword);

  // Atomically update password, consume token, and revoke active sessions
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({
      where: { userId: resetRecord.userId },
    }),
  ]);

  return { message: "Password has been reset successfully" };
}
