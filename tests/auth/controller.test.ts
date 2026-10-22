import argon2 from "argon2";
import { describe, expect, it, mock, spyOn } from "bun:test";
import { SESSION_CONFIG } from "../../src/configs/session.config";
import {
  forgotPasswordHandler,
  getMeHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "../../src/controllers/auth.controller";
import { prisma } from "../../src/db";
import * as mailer from "../../src/libs/mailer";

describe("Auth Controller Handlers", () => {
  const createMockResponse = () => {
    const res: any = {
      statusCode: 200,
      jsonPayload: null,
      cookiesSet: {} as Record<string, { value: any; options: any }>,
      cookiesCleared: {} as Record<string, any>,
    };

    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };

    res.json = (data: any) => {
      res.jsonPayload = data;
      return res;
    };

    res.cookie = (name: string, val: any, opts: any) => {
      res.cookiesSet[name] = { value: val, options: opts };
      return res;
    };

    res.clearCookie = (name: string, opts: any) => {
      res.cookiesCleared[name] = opts;
      return res;
    };

    return res;
  };

  it("registerHandler should respond with 201 and created user", async () => {
    const req: any = {
      body: {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
        role: "CUSTOMER",
      },
    };
    const res = createMockResponse();

    const origUser = prisma.user;
    const origTransaction = prisma.$transaction;
    const mailSpy = spyOn(mailer, "sendVerificationEmail").mockResolvedValue(
      undefined as any,
    );

    const mockCreatedUser = {
      id: "u-1",
      email: "test@example.com",
      name: "Test User",
      role: "CUSTOMER",
      passwordHash: "hash-secret",
      referralCode: "TEST1234",
    };

    Object.defineProperty(prisma, "user", {
      value: { ...origUser, findUnique: mock(async () => null) },
      configurable: true,
    });
    Object.defineProperty(prisma, "$transaction", {
      value: mock(async (cb: any) => {
        return cb({
          user: { create: mock(async () => mockCreatedUser) },
          emailVerificationToken: { create: mock(async () => ({})) },
        });
      }),
      configurable: true,
    });

    try {
      await registerHandler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.jsonPayload.status).toBe("success");
      expect(res.jsonPayload.data.id).toBe("u-1");
      expect(res.jsonPayload.data.email).toBe("test@example.com");
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

  it("verifyEmailHandler should respond with 200", async () => {
    const req: any = { body: { token: "token-123" } };
    const res = createMockResponse();

    const origToken = prisma.emailVerificationToken;
    const origTransaction = prisma.$transaction;

    Object.defineProperty(prisma, "emailVerificationToken", {
      value: {
        ...origToken,
        findUnique: mock(async () => ({
          id: "evt-1",
          userId: "user-1",
          usedAt: null,
          expiresAt: new Date(Date.now() + 100000),
        })),
      },
      configurable: true,
    });
    Object.defineProperty(prisma, "$transaction", {
      value: mock(async () => [{}, {}]),
      configurable: true,
    });

    try {
      await verifyEmailHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonPayload.message).toBe("Email successfully verified");
    } finally {
      Object.defineProperty(prisma, "emailVerificationToken", {
        value: origToken,
        configurable: true,
      });
      Object.defineProperty(prisma, "$transaction", {
        value: origTransaction,
        configurable: true,
      });
    }
  });

  it("loginHandler should set HttpOnly cookie and return user", async () => {
    const req: any = {
      body: { email: "test@example.com", password: "password123" },
    };
    const res = createMockResponse();

    const origUser = prisma.user;
    const origSession = prisma.session;
    const passwordHash = await argon2.hash("password123");

    Object.defineProperty(prisma, "user", {
      value: {
        ...origUser,
        findUnique: mock(async () => ({
          id: "u-1",
          email: "test@example.com",
          name: "Test",
          passwordHash,
        })),
      },
      configurable: true,
    });
    Object.defineProperty(prisma, "session", {
      value: {
        ...origSession,
        create: mock(async () => ({ id: "s-1" })),
      },
      configurable: true,
    });

    try {
      await loginHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.cookiesSet[SESSION_CONFIG.cookieName]).toBeDefined();
      expect(res.cookiesSet[SESSION_CONFIG.cookieName].options.httpOnly).toBe(
        true,
      );
      expect(res.jsonPayload.data.user.id).toBe("u-1");
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

  it("getMeHandler should return user from getUserProfileService", async () => {
    const req: any = { user: { id: "u-1" } };
    const res = createMockResponse();

    const origUser = prisma.user;
    Object.defineProperty(prisma, "user", {
      value: {
        ...origUser,
        findUnique: mock(async () => ({
          id: "u-1",
          email: "test@example.com",
          name: "Test User",
          role: "CUSTOMER",
        })),
      },
      configurable: true,
    });

    try {
      await getMeHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonPayload.data.user.id).toBe("u-1");
    } finally {
      Object.defineProperty(prisma, "user", {
        value: origUser,
        configurable: true,
      });
    }
  });

  it("logoutHandler should clear session cookie and call logoutService", async () => {
    const req: any = {
      cookies: { [SESSION_CONFIG.cookieName]: "session-token-to-kill" },
    };
    const res = createMockResponse();

    const origSession = prisma.session;
    const mockDeleteMany = mock(async () => ({ count: 1 }));

    Object.defineProperty(prisma, "session", {
      value: { ...origSession, deleteMany: mockDeleteMany },
      configurable: true,
    });

    try {
      await logoutHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(mockDeleteMany).toHaveBeenCalled();
      expect(res.cookiesCleared[SESSION_CONFIG.cookieName]).toBeDefined();
    } finally {
      Object.defineProperty(prisma, "session", {
        value: origSession,
        configurable: true,
      });
    }
  });

  it("forgotPasswordHandler should return 200 message", async () => {
    const req: any = { body: { email: "user@example.com" } };
    const res = createMockResponse();

    const origUser = prisma.user;
    const origResetToken = prisma.passwordResetToken;
    const mailSpy = spyOn(mailer, "sendPasswordResetEmail").mockResolvedValue(
      undefined as any,
    );

    Object.defineProperty(prisma, "user", {
      value: {
        ...origUser,
        findUnique: mock(async () => ({
          id: "u-1",
          email: "user@example.com",
        })),
      },
      configurable: true,
    });
    Object.defineProperty(prisma, "passwordResetToken", {
      value: {
        ...origResetToken,
        deleteMany: mock(async () => ({ count: 0 })),
        create: mock(async () => ({ id: "prt-1" })),
      },
      configurable: true,
    });

    try {
      await forgotPasswordHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonPayload.message).toContain("password reset link");
    } finally {
      Object.defineProperty(prisma, "user", {
        value: origUser,
        configurable: true,
      });
      Object.defineProperty(prisma, "passwordResetToken", {
        value: origResetToken,
        configurable: true,
      });
      mailSpy.mockRestore();
    }
  });

  it("resetPasswordHandler should call resetPasswordService and return 200", async () => {
    const req: any = { body: { token: "token-1", password: "newpassword123" } };
    const res = createMockResponse();

    const origResetToken = prisma.passwordResetToken;
    const origTransaction = prisma.$transaction;

    Object.defineProperty(prisma, "passwordResetToken", {
      value: {
        ...origResetToken,
        findUnique: mock(async () => ({
          id: "prt-1",
          userId: "u-1",
          usedAt: null,
          expiresAt: new Date(Date.now() + 100000),
          user: { id: "u-1" },
        })),
      },
      configurable: true,
    });
    Object.defineProperty(prisma, "$transaction", {
      value: mock(async () => [{}, {}, {}]),
      configurable: true,
    });

    try {
      await resetPasswordHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonPayload.message).toBe(
        "Password has been reset successfully",
      );
    } finally {
      Object.defineProperty(prisma, "passwordResetToken", {
        value: origResetToken,
        configurable: true,
      });
      Object.defineProperty(prisma, "$transaction", {
        value: origTransaction,
        configurable: true,
      });
    }
  });
});
