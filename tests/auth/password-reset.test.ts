import { describe, expect, it, mock, spyOn } from "bun:test";
import { prisma } from "../../src/db";
import { ValidationError } from "../../src/errors";
import * as mailer from "../../src/libs/mailer";
import {
  requestPasswordReset,
  resetPasswordService,
} from "../../src/services/auth.service";

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

    it("should delete previous unused tokens and create a new reset token when user exists", async () => {
      const origUser = prisma.user;
      const origPasswordResetToken = prisma.passwordResetToken;

      const mockUser = {
        id: "user-123",
        email: "existing@example.com",
      };

      const mockFindUnique = mock(async () => mockUser);
      const mockDeleteMany = mock(async () => ({ count: 1 }));
      const mockCreate = mock(async () => ({ id: "prt-1" }));

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mockFindUnique },
        configurable: true,
      });
      Object.defineProperty(prisma, "passwordResetToken", {
        value: {
          ...origPasswordResetToken,
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
        Object.defineProperty(prisma, "passwordResetToken", {
          value: origPasswordResetToken,
          configurable: true,
        });
        mailSpy.mockRestore();
      }
    });
  });

  describe("resetPasswordService", () => {
    it("should throw ValidationError if raw token is missing", async () => {
      await expect(resetPasswordService("", "newpassword123")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw ValidationError if new password is too short", async () => {
      await expect(resetPasswordService("sometoken", "123")).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw ValidationError if token does not exist in DB", async () => {
      const origPasswordResetToken = prisma.passwordResetToken;
      const mockFindUnique = mock(async () => null);

      Object.defineProperty(prisma, "passwordResetToken", {
        value: { ...origPasswordResetToken, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          resetPasswordService("invalidtoken", "newpassword123"),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "passwordResetToken", {
          value: origPasswordResetToken,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if token has already been used", async () => {
      const origPasswordResetToken = prisma.passwordResetToken;
      const mockFindUnique = mock(async () => ({
        id: "token-1",
        userId: "user-1",
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        user: { id: "user-1" },
      }));

      Object.defineProperty(prisma, "passwordResetToken", {
        value: { ...origPasswordResetToken, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          resetPasswordService("usedtoken", "newpassword123"),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "passwordResetToken", {
          value: origPasswordResetToken,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if token has expired", async () => {
      const origPasswordResetToken = prisma.passwordResetToken;
      const mockFindUnique = mock(async () => ({
        id: "token-1",
        userId: "user-1",
        usedAt: null,
        expiresAt: new Date(Date.now() - 60000), // Expired
        user: { id: "user-1" },
      }));

      Object.defineProperty(prisma, "passwordResetToken", {
        value: { ...origPasswordResetToken, findUnique: mockFindUnique },
        configurable: true,
      });

      try {
        await expect(
          resetPasswordService("expiredtoken", "newpassword123"),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "passwordResetToken", {
          value: origPasswordResetToken,
          configurable: true,
        });
      }
    });

    it("should successfully reset password, mark token used, and revoke sessions on valid token", async () => {
      const origPasswordResetToken = prisma.passwordResetToken;
      const origTransaction = prisma.$transaction;

      const mockFindUnique = mock(async () => ({
        id: "token-1",
        userId: "user-123",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: { id: "user-123" },
      }));
      const mockTransaction = mock(async () => [{}, {}, {}]);

      Object.defineProperty(prisma, "passwordResetToken", {
        value: { ...origPasswordResetToken, findUnique: mockFindUnique },
        configurable: true,
      });
      Object.defineProperty(prisma, "$transaction", {
        value: mockTransaction,
        configurable: true,
      });

      try {
        const result = await resetPasswordService(
          "validtoken",
          "newsecurepassword123",
        );

        expect(result).toEqual({
          message: "Password has been reset successfully",
        });
        expect(mockTransaction).toHaveBeenCalled();
      } finally {
        Object.defineProperty(prisma, "passwordResetToken", {
          value: origPasswordResetToken,
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
