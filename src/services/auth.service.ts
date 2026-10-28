import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { SESSION_CONFIG } from "../configs/session.config.ts";
import { prisma } from "../db";
import {
  AppError,
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../errors";
import { Prisma } from "../generated/prisma/client";
import { logger } from "../libs/logger.ts";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../libs/mailer.ts";
import {
  generateOtpRecord,
  hashOtp,
  MAX_OTP_ATTEMPTS,
} from "../utils/otp.ts";
import { generateReferralCode } from "../utils/referral";
import { generateSessionToken, hashSessionToken } from "../utils/session";
import type {
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "../validations/auth.validation";

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
  for (let attempts = 0; attempts < 5; attempts++) {
    const codeExists = await prisma.user.findUnique({
      where: { referralCode: newReferralCode },
    });
    if (!codeExists) break;
    newReferralCode = generateReferralCode(name);
  }

  const {
    rawOtp,
    codeHash: verificationCodeHash,
    expiresAt: verificationExpiresAt,
  } = generateOtpRecord();

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

      // Save email verification OTP code
      await tx.emailVerificationCode.create({
        data: {
          userId: user.id,
          codeHash: verificationCodeHash,
          expiresAt: verificationExpiresAt,
          attempts: 0,
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

      try {
        await sendVerificationEmail(user.email, rawOtp);
      } catch (err: any) {
        logger.error(
          `Registration aborted: failed to dispatch verification email to ${user.email}`,
          err,
        );
        throw new AppError(
          `Failed to send verification email: ${err.message || "Email delivery failed"}. Registration rolled back.`,
          500,
        );
      }

      const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    },
  );

  return result;
}

/**
 * Verify a user's email address using the 6-digit OTP code sent to their inbox.
 */
export async function verifyEmailService(input: VerifyEmailInput) {
  const { email, otp } = input;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ValidationError("Invalid or expired verification code");
  }

  if (user.emailVerifiedAt) {
    return { message: "Email has already been verified" };
  }

  const latestCode = await prisma.emailVerificationCode.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestCode) {
    throw new ValidationError(
      "No active verification code found. Please request a new code.",
    );
  }

  if (latestCode.attempts >= MAX_OTP_ATTEMPTS) {
    throw new ValidationError(
      "Verification code has been invalidated due to too many failed attempts. Please request a new code.",
    );
  }

  if (latestCode.expiresAt < new Date()) {
    throw new ValidationError(
      "Verification code has expired. Please request a new code.",
    );
  }

  const inputHash = hashOtp(otp);
  if (inputHash !== latestCode.codeHash) {
    const updated = await prisma.emailVerificationCode.update({
      where: { id: latestCode.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - updated.attempts;
    if (remaining <= 0) {
      throw new ValidationError(
        "Invalid verification code. This code has been invalidated due to too many failed attempts. Please request a new code.",
      );
    }
    throw new ValidationError(
      `Invalid verification code. ${remaining} attempt(s) remaining.`,
    );
  }

  await prisma.$transaction([
    prisma.emailVerificationCode.update({
      where: { id: latestCode.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return { message: "Email successfully verified" };
}

/**
 * Re-send a fresh 6-digit verification code to the user's email.
 */
export async function resendVerificationCodeService(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Avoid email enumeration
    return { message: "If your email is registered and unverified, a verification code has been sent." };
  }

  if (user.emailVerifiedAt) {
    throw new ValidationError("Email is already verified");
  }

  // Invalidate any active unused verification codes
  await prisma.emailVerificationCode.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  const { rawOtp, codeHash, expiresAt } = generateOtpRecord();

  await prisma.emailVerificationCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt,
      attempts: 0,
    },
  });

  try {
    await sendVerificationEmail(user.email, rawOtp);
  } catch (err: any) {
    logger.error(
      `Failed to resend verification email to ${user.email}`,
      err,
    );
    throw new AppError(
      `Failed to send verification email: ${err.message || "Email delivery failed"}.`,
      500,
    );
  }

  return { message: "Verification code sent to your email" };
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
 * Generates a 6-digit OTP code, hashes and stores it with a 10-minute expiration,
 * and sends an email with the raw OTP code.
 *
 * Silently returns if user is not found to prevent account enumeration.
 *
 * @param email The user's registered email address.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return;
  }

  const {
    rawOtp,
    codeHash,
    expiresAt,
  } = generateOtpRecord();

  await prisma.passwordResetCode.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  });

  await prisma.passwordResetCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt,
      attempts: 0,
    },
  });

  await sendPasswordResetEmail(user.email, rawOtp).catch(() => null);
}

/**
 * Complete the password reset process using email, the 6-digit OTP code, and the new password.
 * Atomically updates user's passwordHash, marks the reset code as used,
 * and invalidates all existing active sessions.
 *
 * @param input Contains email, 6-digit otp code, and new password.
 */
export async function resetPasswordService(input: ResetPasswordInput) {
  const { email, otp, password: newPassword } = input;

  if (!newPassword || newPassword.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ValidationError("Invalid or expired password reset code");
  }

  const latestCode = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestCode) {
    throw new ValidationError("Invalid or expired password reset code");
  }

  if (latestCode.attempts >= MAX_OTP_ATTEMPTS) {
    throw new ValidationError(
      "Reset code has been invalidated due to too many failed attempts. Please request a new code.",
    );
  }

  if (latestCode.expiresAt < new Date()) {
    throw new ValidationError(
      "Password reset code has expired. Please request a new one.",
    );
  }

  const inputHash = hashOtp(otp);
  if (inputHash !== latestCode.codeHash) {
    const updated = await prisma.passwordResetCode.update({
      where: { id: latestCode.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - updated.attempts;
    if (remaining <= 0) {
      throw new ValidationError(
        "Invalid reset code. This code has been invalidated due to too many failed attempts. Please request a new code.",
      );
    }
    throw new ValidationError(
      `Invalid reset code. ${remaining} attempt(s) remaining.`,
    );
  }

  const hashedPassword = await argon2.hash(newPassword);

  // Atomically update password, consume code, and revoke active sessions
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    }),
    prisma.passwordResetCode.update({
      where: { id: latestCode.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  return { message: "Password has been reset successfully" };
}
