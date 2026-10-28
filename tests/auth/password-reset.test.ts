import { describe, expect, it, mock, spyOn } from "bun:test";
import { prisma } from "../../src/db";
import { ValidationError } from "../../src/errors";
import * as mailer from "../../src/libs/mailer";
import {
  requestPasswordReset,
  resetPasswordService,
  verifyResetPasswordService,
} from "../../src/services/auth.service";
import { hashOtp } from "../../src/utils/otp";
import { hashToken } from "../../src/utils/token";

describe("Password Reset Flow", () => {
  describe("requestPasswordReset", () => {
    it("should return silently without throwing error when user is not found (anti-enumeration)", async () => {
      const origUser = prisma.user;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          requestPasswordReset("nonexistent@example.com"),
        ).resolves.toBeUndefined();
        expect(mockFindUnique).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should delete previous unused codes and create a new reset code when user exists", async () => {
      const origUser = prisma.user;
      const origPasswordResetCode = prisma.passwordResetCode;

      const mockUser = {
        id: "user-123",
        email: "existing@example.com",
      };

      const mockFindUnique = mock(async () => mockUser);
      const mockDeleteMany = mock(async () => ({ count: 1 }));
      const mockCreate = mock(async () => ({ id: "prc-1" }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });
      Object.defineProperty(prisma, "passwordResetCode", {
        value: {
          ...origPasswordResetCode,
          deleteMany: mockDeleteMany,
          create: mockCreate,
        },
        configurable: true,
      });

      const mailSpy = spyOn(mailer, "sendPasswordResetEmail").mockResolvedValue(
        undefined as any,
      );

      try {
        await requestPasswordReset("existing@example.com");

        expect(mailSpy).toHaveBeenCalledWith(
          "existing@example.com",
          expect.any(String),
        );

        expect(mockDeleteMany).toHaveBeenCalledWith({
          where: {
            userId: "user-123",
            usedAt: null,
          },
        });
        expect(mockCreate).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "passwordResetCode", {
          value: origPasswordResetCode,
          configurable: true,
        });
        mailSpy.mockRestore();
      }
    });
  });

  describe("verifyResetPasswordService", () => {
    it("should throw ValidationError if user does not exist", async () => {
      const origUser = prisma.user;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          verifyResetPasswordService({
            email: "notfound@example.com",
            otp: "123456",
          }),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if no active reset code found", async () => {
      const origUser = prisma.user;
      const origCode = prisma.passwordResetCode;

      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "user@example.com",
      }));
      const mockFindCode = mock(async () => null);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "passwordResetCode", {
        value: { ...origCode, findFirst: mockFindCode },
        configurable: true,
      });

      try {
        await expect(
          verifyResetPasswordService({
            email: "user@example.com",
            otp: "123456",
          }),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "passwordResetCode", {
          value: origCode,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if code has expired", async () => {
      const origUser = prisma.user;
      const origCode = prisma.passwordResetCode;

      const mockFindUser = mock(async () => ({
        id: "user-1",
        email: "user@example.com",
      }));
      const mockFindCode = mock(async () => ({
        id: "code-1",
        userId: "user-1",
        usedAt: null,
        attempts: 0,
        expiresAt: new Date(Date.now() - 60000), // Expired
      }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "passwordResetCode", {
        value: { ...origCode, findFirst: mockFindCode },
        configurable: true,
      });

      try {
        await expect(
          verifyResetPasswordService({
            email: "user@example.com",
            otp: "123456",
          }),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "passwordResetCode", {
          value: origCode,
          configurable: true,
        });
      }
    });

    it("should successfully verify OTP and return a one-time reset token", async () => {
      const origUser = prisma.user;
      const origCode = prisma.passwordResetCode;

      const validOtp = "654321";

      const mockFindUser = mock(async () => ({
        id: "user-123",
        email: "user@example.com",
      }));
      const mockFindCode = mock(async () => ({
        id: "code-1",
        userId: "user-123",
        codeHash: hashOtp(validOtp),
        usedAt: null,
        attempts: 0,
        expiresAt: new Date(Date.now() + 60000),
      }));
      const mockUpdate = mock(async () => ({ id: "code-1" }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "passwordResetCode", {
        value: { ...origCode, findFirst: mockFindCode, update: mockUpdate },
        configurable: true,
      });

      try {
        const result = await verifyResetPasswordService({
          email: "user@example.com",
          otp: validOtp,
        });

        expect(result.message).toBe("Password reset code verified successfully");
        expect(typeof result.resetToken).toBe("string");
        expect(mockUpdate).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
        Object.defineProperty(prisma, "passwordResetCode", {
          value: origCode,
          configurable: true,
        });
      }
    });
  });

  describe("resetPasswordService", () => {
    it("should throw ValidationError if reset token is missing", async () => {
      await expect(
        resetPasswordService({
          resetToken: "",
          password: "newpassword123",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError if new password is too short", async () => {
      await expect(
        resetPasswordService({
          resetToken: "some-reset-token",
          password: "123",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError if reset token is invalid", async () => {
      const origCode = prisma.passwordResetCode;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "passwordResetCode", {
        value: { ...origCode, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          resetPasswordService({
            resetToken: "non-existent-token",
            password: "newpassword123",
          }),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "passwordResetCode", {
          value: origCode,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if reset token has already been used", async () => {
      const origCode = prisma.passwordResetCode;
      const mockFindUnique = mock(async () => ({
        id: "code-1",
        userId: "user-123",
        usedAt: new Date(),
        resetTokenExpiresAt: new Date(Date.now() + 60000),
      }));

      Object.defineProperty(prisma, "passwordResetCode", {
        value: { ...origCode, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          resetPasswordService({
            resetToken: "already-used-token",
            password: "newpassword123",
          }),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "passwordResetCode", {
          value: origCode,
          configurable: true,
        });
      }
    });

    it("should successfully reset password, mark code used, and revoke sessions on valid reset token", async () => {
      const origCode = prisma.passwordResetCode;
      const origTransaction = prisma.$transaction;

      const rawResetToken = "valid-reset-token-sample";
      const tokenHash = hashToken(rawResetToken);

      const mockFindUnique = mock(async () => ({
        id: "code-1",
        userId: "user-123",
        resetTokenHash: tokenHash,
        usedAt: null,
        resetTokenExpiresAt: new Date(Date.now() + 60000),
        user: { id: "user-123" },
      }));
      const mockTransaction = mock(async () => [{}, {}, {}]);

      Object.defineProperty(prisma, "passwordResetCode", {
        value: { ...origCode, findUnique: mockFindUnique },
        configurable: true,
      });
      Object.defineProperty(prisma, "$transaction", {
        value: mockTransaction,
        configurable: true,
      });

      try {
        const result = await resetPasswordService({
          resetToken: rawResetToken,
          password: "newsecurepassword123",
        });

        expect(result).toEqual({
          message: "Password has been reset successfully",
        });
        expect(mockTransaction).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "passwordResetCode", {
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
});
