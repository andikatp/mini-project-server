import { z } from "zod"

export const UserRoleSchema = z.enum(["CUSTOMER", "EVENT_ORGANIZER"]);

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
