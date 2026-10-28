import { describe, expect, it } from "bun:test";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../../src/validations/auth.validation";

describe("Auth Validation Schemas", () => {
  describe("registerSchema", () => {
    it("should validate a correct registration payload", () => {
      const input = {
        email: "alice@example.com",
        password: "securePassword123",
        name: "Alice Wonderland",
        role: "CUSTOMER",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should default role to CUSTOMER if omitted", () => {
      const input = {
        email: "bob@example.com",
        password: "securePassword123",
        name: "Bob Builder",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("CUSTOMER");
      }
    });

    it("should reject invalid email format", () => {
      const input = {
        email: "invalid-email-address",
        password: "securePassword123",
        name: "Alice",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject password shorter than 6 characters", () => {
      const input = {
        email: "alice@example.com",
        password: "123",
        name: "Alice",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject missing name", () => {
      const input = {
        email: "alice@example.com",
        password: "password123",
        name: "",
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login payload", () => {
      const input = {
        email: "alice@example.com",
        password: "password123",
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject missing password", () => {
      const input = {
        email: "alice@example.com",
        password: "",
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("verifyEmailSchema", () => {
    it("should accept valid email and 6-digit otp", () => {
      const result = verifyEmailSchema.safeParse({
        email: "user@example.com",
        otp: "123456",
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-6-digit otp", () => {
      const result = verifyEmailSchema.safeParse({
        email: "user@example.com",
        otp: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric otp", () => {
      const result = verifyEmailSchema.safeParse({
        email: "user@example.com",
        otp: "12a456",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resendVerificationSchema", () => {
    it("should accept valid email", () => {
      const result = resendVerificationSchema.safeParse({
        email: "user@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = resendVerificationSchema.safeParse({
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("should accept valid email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "user@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("should accept valid email, 6-digit otp, and password", () => {
      const result = resetPasswordSchema.safeParse({
        email: "user@example.com",
        otp: "654321",
        password: "new-valid-password",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid otp format", () => {
      const result = resetPasswordSchema.safeParse({
        email: "user@example.com",
        otp: "wrong",
        password: "new-valid-password",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const result = resetPasswordSchema.safeParse({
        email: "user@example.com",
        otp: "123456",
        password: "123",
      });
      expect(result.success).toBe(false);
    });
  });
});
