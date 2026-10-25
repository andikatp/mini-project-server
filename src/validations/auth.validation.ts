import { z } from "zod";

const UserRoleSchema = z.enum(["CUSTOMER", "EVENT_ORGANIZER"]);

export const registerSchema = z.object({
  email: z.email("Invalid email address format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  name: z.string().min(1, "Name is required"),
  role: UserRoleSchema.default("CUSTOMER"),
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});


export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address format"),
});


export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
