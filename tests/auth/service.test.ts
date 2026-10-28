import argon2 from "argon2";
import { describe, expect, it, mock, spyOn } from "bun:test";
import { prisma } from "../../src/db";
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../../src/errors";
import * as mailer from "../../src/libs/mailer";
import {
  getUserProfileService,
  loginUserService,
  logoutService,
  registerUserService,
  resendVerificationCodeService,
  validateSessionService,
  verifyEmailService,
} from "../../src/services/auth.service";

describe("Auth Service Core", () => {
  describe("registerUserService", () => {
    it("should throw ConflictError if email is already registered", async () => {
      const origUser = prisma.user;
      const mockFindUnique = mock(async () => ({ id: "existing-user-id" }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          registerUserService({
            email: "existing@example.com",
            password: "password123",
            name: "Existing User",
            role: "CUSTOMER",
          }),
        ).rejects.toThrow(ConflictError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if referralCode is invalid", async () => {
      const origUser = prisma.user;
      // First findUnique for email check returns null; second for referralCode returns null
      const mockFindUnique = mock(async ({ where }: any) => {
        if (where?.email) return null;
        if (where?.referralCode) return null;
        return null;
      });

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          registerUserService({
            email: "new@example.com",
            password: "password123",
            name: "New User",
            role: "CUSTOMER",
            referralCode: "INVALID_CODE",
          }),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should successfully register user, create verification token, and dispatch email", async () => {
      const origUser = prisma.user;
      const origTransaction = prisma.$transaction;
      const mailSpy = spyOn(mailer, "sendVerificationEmail").mockResolvedValue(
        undefined as any,
      );

      const mockCreatedUser = {
        id: "new-user-123",
        email: "brandnew@example.com",
        name: "Brand New",
        role: "CUSTOMER",
        passwordHash: "hashed-pw",
        referralCode: "BRAND1234",
      };

      const mockFindUnique = mock(async () => null);
      const mockTransaction = mock(async (cb: any) => {
        const tx = {
          user: { create: mock(async () => mockCreatedUser) },
          emailVerificationCode: { create: mock(async () => ({})) },
        };
        return cb(tx);
      });

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });
      Object.defineProperty(prisma, "$transaction", {
        value: mockTransaction,
        configurable: true,
      });

      try {
        const result = await registerUserService({
          email: "brandnew@example.com",
          password: "password123",
          name: "Brand New",
          role: "CUSTOMER",
        });

        expect(result.id).toBe("new-user-123");
        expect(result.email).toBe("brandnew@example.com");
        expect((result as any).passwordHash).toBeUndefined();
        expect(mailSpy).toHaveBeenCalledWith(
          "brandnew@example.com",
          expect.any(String),
        );
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "$transaction", {
          value: origTransaction,
          configurable: true,
        });
        mailSpy.mockRestore();
      }
    });

    it("should abort registration and throw AppError if sending verification email fails", async () => {
      const origUser = prisma.user;
      const origTransaction = prisma.$transaction;
      const mailSpy = spyOn(mailer, "sendVerificationEmail").mockRejectedValue(
        new Error("Resend API rejected"),
      );

      const mockCreatedUser = {
        id: "new-user-123",
        email: "brandnew@example.com",
        name: "Brand New",
        role: "CUSTOMER",
        passwordHash: "hashed-pw",
        referralCode: "BRAND1234",
      };

      const mockFindUnique = mock(async () => null);
      const mockTransaction = mock(async (cb: any) => {
        const tx = {
          user: { create: mock(async () => mockCreatedUser) },
          emailVerificationCode: { create: mock(async () => ({})) },
        };
        return cb(tx);
      });

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });
      Object.defineProperty(prisma, "$transaction", {
        value: mockTransaction,
        configurable: true,
      });

      try {
        await expect(
          registerUserService({
            email: "brandnew@example.com",
            password: "password123",
            name: "Brand New",
            role: "CUSTOMER",
          }),
        ).rejects.toThrow("Failed to send verification email");
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "$transaction", {
          value: origTransaction,
          configurable: true,
        });
        mailSpy.mockRestore();
      }
    });
  });

  describe("verifyEmailService", () => {
    it("should throw ValidationError if user does not exist", async () => {
      const origUser = prisma.user;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          verifyEmailService({ email: "notfound@example.com", otp: "123456" }),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if no active verification code found", async () => {
      const origUser = prisma.user;
      const origCode = prisma.emailVerificationCode;

      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "alice@example.com",
        emailVerifiedAt: null,
      }));
      const mockFindCode = mock(async () => null);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "emailVerificationCode", {
        value: { ...origCode, findFirst: mockFindCode },
        configurable: true,
      });

      try {
        await expect(
          verifyEmailService({ email: "alice@example.com", otp: "123456" }),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "emailVerificationCode", {
          value: origCode,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if verification code has expired", async () => {
      const origUser = prisma.user;
      const origCode = prisma.emailVerificationCode;

      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "alice@example.com",
        emailVerifiedAt: null,
      }));
      const mockFindCode = mock(async () => ({
        id: "evc-1",
        userId: "user-1",
        codeHash: "somehash",
        attempts: 0,
        usedAt: null,
        expiresAt: new Date(Date.now() - 10000), // Expired
      }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "emailVerificationCode", {
        value: { ...origCode, findFirst: mockFindCode },
        configurable: true,
      });

      try {
        await expect(
          verifyEmailService({ email: "alice@example.com", otp: "123456" }),
        ).rejects.toThrow("Verification code has expired");
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "emailVerificationCode", {
          value: origCode,
          configurable: true,
        });
      }
    });

    it("should increment attempts and reject if code does not match", async () => {
      const origUser = prisma.user;
      const origCode = prisma.emailVerificationCode;
      const mockUpdate = mock(async () => ({ attempts: 1 }));

      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "alice@example.com",
        emailVerifiedAt: null,
      }));
      const mockFindCode = mock(async () => ({
        id: "evc-1",
        userId: "user-1",
        codeHash: "actual-hash",
        attempts: 0,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "emailVerificationCode", {
        value: { ...origCode, findFirst: mockFindCode, update: mockUpdate },
        configurable: true,
      });

      try {
        await expect(
          verifyEmailService({ email: "alice@example.com", otp: "999999" }),
        ).rejects.toThrow("Invalid verification code. 4 attempt(s) remaining.");
        expect(mockUpdate).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "emailVerificationCode", {
          value: origCode,
          configurable: true,
        });
      }
    });

    it("should reject if code already reached maximum 5 failed attempts", async () => {
      const origUser = prisma.user;
      const origCode = prisma.emailVerificationCode;

      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "alice@example.com",
        emailVerifiedAt: null,
      }));
      const mockFindCode = mock(async () => ({
        id: "evc-1",
        userId: "user-1",
        codeHash: "actual-hash",
        attempts: 5,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "emailVerificationCode", {
        value: { ...origCode, findFirst: mockFindCode },
        configurable: true,
      });

      try {
        await expect(
          verifyEmailService({ email: "alice@example.com", otp: "123456" }),
        ).rejects.toThrow("Verification code has been invalidated due to too many failed attempts");
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "emailVerificationCode", {
          value: origCode,
          configurable: true,
        });
      }
    });

    it("should successfully verify email and mark code as used", async () => {
      const origUser = prisma.user;
      const origCode = prisma.emailVerificationCode;
      const origTransaction = prisma.$transaction;

      const { hashOtp } = await import("../../src/utils/otp");
      const validOtp = "123456";

      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "alice@example.com",
        emailVerifiedAt: null,
      }));
      const mockFindCode = mock(async () => ({
        id: "evc-1",
        userId: "user-1",
        codeHash: hashOtp(validOtp),
        attempts: 0,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      }));
      const mockTransaction = mock(async () => [{}, {}]);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "emailVerificationCode", {
        value: { ...origCode, findFirst: mockFindCode },
        configurable: true,
      });
      Object.defineProperty(prisma, "$transaction", {
        value: mockTransaction,
        configurable: true,
      });

      try {
        const result = await verifyEmailService({
          email: "alice@example.com",
          otp: validOtp,
        });
        expect(result.message).toBe("Email successfully verified");
        expect(mockTransaction).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "emailVerificationCode", {
          value: origCode,
          configurable: true,
        });
        Object.defineProperty(prisma, "$transaction", {
          value: origTransaction,
          configurable: true,
        });
      }
    });
  });

  describe("resendVerificationCodeService", () => {
    it("should throw ValidationError if email is already verified", async () => {
      const origUser = prisma.user;
      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "verified@example.com",
        emailVerifiedAt: new Date(),
      }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });

      try {
        await expect(
          resendVerificationCodeService("verified@example.com"),
        ).rejects.toThrow("Email is already verified");
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should invalidate old codes, create new code, and send email", async () => {
      const origUser = prisma.user;
      const origCode = prisma.emailVerificationCode;
      const mailSpy = spyOn(mailer, "sendVerificationEmail").mockResolvedValue(
        undefined as any,
      );

      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "unverified@example.com",
        emailVerifiedAt: null,
      }));
      const mockUpdateMany = mock(async () => ({ count: 1 }));
      const mockCreate = mock(async () => ({ id: "new-code-1" }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "emailVerificationCode", {
        value: {
          ...origCode,
          updateMany: mockUpdateMany,
          create: mockCreate,
        },
        configurable: true,
      });

      try {
        const result = await resendVerificationCodeService(
          "unverified@example.com",
        );
        expect(result.message).toBe("Verification code sent to your email");
        expect(mockUpdateMany).toHaveBeenCalled();
        expect(mockCreate).toHaveBeenCalled();
        expect(mailSpy).toHaveBeenCalledWith(
          "unverified@example.com",
          expect.any(String),
        );
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "emailVerificationCode", {
          value: origCode,
          configurable: true,
        });
        mailSpy.mockRestore();
      }
    });
  });

  describe("loginUserService", () => {
    it("should throw AuthenticationError if user is not found", async () => {
      const origUser = prisma.user;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          loginUserService({
            email: "notfound@example.com",
            password: "password123",
          }),
        ).rejects.toThrow(AuthenticationError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should throw AuthenticationError if password does not match", async () => {
      const origUser = prisma.user;
      const realHashedPassword = await argon2.hash("correct-password");

      const mockFindUnique = mock(async () => ({
        id: "user-1",
        email: "user@example.com",
        passwordHash: realHashedPassword,
      }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          loginUserService({
            email: "user@example.com",
            password: "wrong-password",
          }),
        ).rejects.toThrow(AuthenticationError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should throw AuthenticationError if email is not verified", async () => {
      const origUser = prisma.user;
      const realHashedPassword = await argon2.hash("correct-password");

      const mockFindUnique = mock(async () => ({
        id: "user-1",
        email: "unverified@example.com",
        passwordHash: realHashedPassword,
        emailVerifiedAt: null,
      }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          loginUserService({
            email: "unverified@example.com",
            password: "correct-password",
          }),
        ).rejects.toThrow("Please verify your email address before logging in");
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should return user and sessionToken on successful login", async () => {
      const origUser = prisma.user;
      const origSession = prisma.session;
      const realHashedPassword = await argon2.hash("correct-password");

      const mockFindUnique = mock(async () => ({
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        passwordHash: realHashedPassword,
        emailVerifiedAt: new Date(),
      }));
      const mockSessionCreate = mock(async () => ({ id: "session-1" }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });
      Object.defineProperty(prisma, "session", {
        value: { ...origSession, create: mockSessionCreate },
        configurable: true,
      });

      try {
        const { user, sessionToken } = await loginUserService({
          email: "user@example.com",
          password: "correct-password",
        });

        expect(user.id).toBe("user-1");
        expect(user.email).toBe("user@example.com");
        expect((user as any).passwordHash).toBeUndefined();
        expect(typeof sessionToken).toBe("string");
        expect(mockSessionCreate).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "session", {
          value: origSession,
          configurable: true,
        });
      }
    });
  });

  describe("validateSessionService & logoutService", () => {
    it("should return null if session is not in database", async () => {
      const origSession = prisma.session;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "session", {
        value: { ...origSession, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        const result = await validateSessionService("nonexistent-raw-token");
        expect(result).toBeNull();
      } finally {
        Object.defineProperty(prisma, "session", {
          value: origSession,
          configurable: true,
        });
      }
    });

    it("should return null and delete session if session is expired", async () => {
      const origSession = prisma.session;
      const mockFindUnique = mock(async () => ({
        id: "session-1",
        expiresAt: new Date(Date.now() - 10000), // Expired
        user: { id: "user-1", passwordHash: "secret" },
      }));
      const mockDelete = mock(async () => ({ id: "session-1" }));

      Object.defineProperty(prisma, "session", {
        value: {
          ...origSession,
          findUnique: mockFindUnique,
          delete: mockDelete,
        },
        configurable: true,
      });

      try {
        const result = await validateSessionService("expired-raw-token");
        expect(result).toBeNull();
        expect(mockDelete).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "session", {
          value: origSession,
          configurable: true,
        });
      }
    });

    it("should return sanitized user when session is valid", async () => {
      const origSession = prisma.session;
      const mockFindUnique = mock(async () => ({
        id: "session-1",
        expiresAt: new Date(Date.now() + 100000),
        user: { id: "user-1", name: "User", passwordHash: "secret" },
      }));

      Object.defineProperty(prisma, "session", {
        value: { ...origSession, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        const result = await validateSessionService("valid-raw-token");
        expect(result).not.toBeNull();
        expect(result!.user.id).toBe("user-1");
        expect((result!.user as any).passwordHash).toBeUndefined();
      } finally {
        Object.defineProperty(prisma, "session", {
          value: origSession,
          configurable: true,
        });
      }
    });

    it("should delete session records on logoutService", async () => {
      const origSession = prisma.session;
      const mockDeleteMany = mock(async () => ({ count: 1 }));

      Object.defineProperty(prisma, "session", {
        value: { ...origSession, deleteMany: mockDeleteMany },
        configurable: true,
      });

      try {
        await logoutService("raw-logout-token");
        expect(mockDeleteMany).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "session", {
          value: origSession,
          configurable: true,
        });
      }
    });
  });

  describe("getUserProfileService", () => {
    it("should throw AuthenticationError if user is not found", async () => {
      const origUser = prisma.user;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(getUserProfileService("missing-id")).rejects.toThrow(
          AuthenticationError,
        );
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should return user profile if found", async () => {
      const origUser = prisma.user;
      const mockFindUnique = mock(async () => ({
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "CUSTOMER",
      }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        const user = await getUserProfileService("user-1");
        expect(user.id).toBe("user-1");
        expect(user.email).toBe("user@example.com");
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });
  });
});
