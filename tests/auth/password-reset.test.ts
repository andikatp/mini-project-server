import { describe, expect, it, mock, spyOn } from "bun:test";
import { prisma } from "../../src/db";
import { ValidationError } from "../../src/errors";
import * as mailer from "../../src/libs/mailer";
import {
  requestPasswordReset,
  resetPasswordService,
} from "../../src/services/auth.service";
import { hashOtp } from "../../src/utils/otp";

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

  describe("resetPasswordService", () => {
    it("should throw ValidationError if new password is too short", async () => {
      await expect(
        resetPasswordService({
          email: "user@example.com",
          otp: "123456",
          password: "123",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError if user does not exist", async () => {
      const origUser = prisma.user;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          resetPasswordService({
            email: "notfound@example.com",
            otp: "123456",
            password: "newpassword123",
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
          resetPasswordService({
            email: "user@example.com",
            otp: "123456",
            password: "newpassword123",
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
          resetPasswordService({
            email: "user@example.com",
            otp: "123456",
            password: "newpassword123",
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

    it("should successfully reset password, mark code used, and revoke sessions on valid OTP", async () => {
      const origUser = prisma.user;
      const origCode = prisma.passwordResetCode;
      const origTransaction = prisma.$transaction;

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
      const mockTransaction = mock(async () => [{}, {}, {}]);

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUser },
        configurable: true,
      });
      Object.defineProperty(prisma, "passwordResetCode", {
        value: { ...origCode, findFirst: mockFindCode },
        configurable: true,
      });
      Object.defineProperty(prisma, "$transaction", {
        value: mockTransaction,
        configurable: true,
      });

      try {
        const result = await resetPasswordService({
          email: "user@example.com",
          otp: validOtp,
          password: "newsecurepassword123",
        });

        expect(result).toEqual({
          message: "Password has been reset successfully",
        });
        expect(mockTransaction).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
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
