import { describe, expect, it, mock } from "bun:test";
import { SESSION_CONFIG } from "../../src/configs/session.config";
import { prisma } from "../../src/db";
import { AuthenticationError } from "../../src/errors";
import { requireAuth } from "../../src/middlewares/auth.middleware";

describe("requireAuth Middleware", () => {
  it("should throw AuthenticationError when session cookie is missing", async () => {
    const req: any = { cookies: {} };
    const res: any = {};
    const next = mock(() => {});

    await expect(requireAuth(req, res, next)).rejects.toThrow(
      AuthenticationError,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should throw AuthenticationError when session is not found in database", async () => {
    const req: any = {
      cookies: {
        [SESSION_CONFIG.cookieName]: "invalid-token",
      },
    };
    const res: any = {};
    const next = mock(() => {});

    const origSession = prisma.session;
    const mockFindUnique = mock(async () => null);

    Object.defineProperty(prisma, "session", {
      value: { ...origSession, findUnique: mockFindUnique },
      configurable: true,
    });

    try {
      await expect(requireAuth(req, res, next)).rejects.toThrow(
        AuthenticationError,
      );
      expect(next).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(prisma, "session", {
        value: origSession,
        configurable: true,
      });
    }
  });

  it("should attach user and sessionId to req and call next() on valid session", async () => {
    const req: any = {
      cookies: {
        [SESSION_CONFIG.cookieName]: "valid-token",
      },
    };
    const res: any = {};
    const next = mock(() => {});

    const mockUser = {
      id: "user-123",
      email: "alice@example.com",
      name: "Alice",
      role: "CUSTOMER" as const,
      avatarUrl: null,
      referralCode: "ALICE123",
      emailVerifiedAt: new Date(),
      passwordHash: "secret-hashed-password",
    };

    const origSession = prisma.session;
    const mockFindUnique = mock(async () => ({
      id: "session-456",
      expiresAt: new Date(Date.now() + 100000),
      user: mockUser,
    }));

    Object.defineProperty(prisma, "session", {
      value: { ...origSession, findUnique: mockFindUnique },
      configurable: true,
    });

    try {
      await requireAuth(req, res, next);

      expect(req.user.id).toBe("user-123");
      expect(req.user.email).toBe("alice@example.com");
      expect(req.user.passwordHash).toBeUndefined();
      expect(req.sessionId).toBe("session-456");
      expect(next).toHaveBeenCalled();
    } finally {
      Object.defineProperty(prisma, "session", {
        value: origSession,
        configurable: true,
      });
    }
  });
});
