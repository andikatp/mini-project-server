import { describe, expect, it, mock } from "bun:test";
import { getMeHandler } from "../../src/controllers/user.controller";
import { prisma } from "../../src/db";
import { AuthenticationError } from "../../src/errors";
import { getUserProfileService } from "../../src/services/user.service";

describe("User Service & Controller", () => {
  describe("getUserProfileService", () => {
    it("should throw AuthenticationError if user is not found", async () => {
      const origUser = prisma.user;
      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mock(async () => null) },
        configurable: true,
      });

      try {
        await expect(getUserProfileService("unknown-id")).rejects.toThrow(
          AuthenticationError,
        );
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });

    it("should return user profile without passwordHash if found", async () => {
      const origUser = prisma.user;
      const mockProfile = {
        id: "user-123",
        email: "alice@example.com",
        name: "Alice",
        role: "CUSTOMER" as const,
        avatarUrl: null,
        referralCode: "ALICE123",
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
      };

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mock(async () => mockProfile) },
        configurable: true,
      });

      try {
        const result = await getUserProfileService("user-123");
        expect(result).toEqual(mockProfile);
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });
  });

  describe("getMeHandler", () => {
    it("should respond with 200 and user profile data", async () => {
      const req: any = { user: { id: "user-123" } };
      const res: any = {
        statusCode: 200,
        jsonPayload: null,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: any) {
          this.jsonPayload = data;
          return this;
        },
      };

      const origUser = prisma.user;
      const mockProfile = {
        id: "user-123",
        email: "alice@example.com",
        name: "Alice",
        role: "CUSTOMER",
      };

      Object.defineProperty(prisma, "user", {
        value: { ...origUser, findUnique: mock(async () => mockProfile) },
        configurable: true,
      });

      try {
        await getMeHandler(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.jsonPayload.status).toBe("success");
        expect(res.jsonPayload.data.user.id).toBe("user-123");
      } finally {
        Object.defineProperty(prisma, "user", {
          value: origUser,
          configurable: true,
        });
      }
    });
  });
});
