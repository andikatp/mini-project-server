import { describe, expect, it } from "bun:test";
import { createCsrfProtection } from "../../src/middlewares/csrf.middleware";
import { ForbiddenError } from "../../src/errors";

describe("Security Safeguards Unit Tests", () => {
  describe("CSRF Protection Middleware", () => {
    const allowedOrigins = new Set([
      "http://localhost:3000",
      "https://event-mgmt.vercel.app",
    ]);
    const csrfMiddleware = createCsrfProtection(allowedOrigins);

    it("should allow safe GET requests without checking origin", () => {
      let nextCalled = false;
      const req: any = { method: "GET", headers: { origin: "https://evil.com" } };
      const res: any = {};
      csrfMiddleware(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    });

    it("should allow state-changing requests from allowed origin", () => {
      let nextCalled = false;
      const req: any = {
        method: "POST",
        headers: { origin: "https://event-mgmt.vercel.app" },
      };
      const res: any = {};

      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        csrfMiddleware(req, res, () => {
          nextCalled = true;
        });
        expect(nextCalled).toBe(true);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it("should reject state-changing requests from untrusted origin", () => {
      const req: any = {
        method: "POST",
        headers: { origin: "https://attacker-site.com" },
      };
      const res: any = {};

      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        expect(() => {
          csrfMiddleware(req, res, () => {});
        }).toThrow(ForbiddenError);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it("should reject state-changing requests with untrusted referer", () => {
      const req: any = {
        method: "POST",
        headers: { referer: "https://attacker-site.com/malicious-form" },
      };
      const res: any = {};

      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        expect(() => {
          csrfMiddleware(req, res, () => {});
        }).toThrow(ForbiddenError);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });
});
