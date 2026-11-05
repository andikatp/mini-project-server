import { z } from "zod";

const UserRoleSchema = z.enum(["CUSTOMER", "EVENT_ORGANIZER"]);

// Normalized email schema: trims whitespace and converts to lowercase
const emailSchema = z
  .email("Invalid email address format")
  .transform((val) => val.trim().toLowerCase());

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters long"),
  name: z.string().min(1, "Name is required").transform((val) => val.trim()),
  role: UserRoleSchema.default("CUSTOMER"),
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "Verification code must be a 6-digit number"),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyResetPasswordSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "Reset code must be a 6-digit number"),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetPasswordInput = z.infer<typeof verifyResetPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
